import assert from "node:assert/strict";
import http from "node:http";
import { after, before, beforeEach, describe, test } from "node:test";
import { io as createClient, Socket as ClientSocket } from "socket.io-client";
import { db } from "../src/database/connection";
import { LeagueMembersService } from "../src/modules/league-members/league-members.service";
import { LeaguesService } from "../src/modules/leagues/leagues.service";
import { LobbiesService } from "../src/modules/lobbies/lobbies.service";
import { SocketActionResult } from "../src/websocket/socket-action";
import { SOCKET_EVENTS } from "../src/websocket/socket-events";
import { SocketEmitter } from "../src/websocket/emitter";
import { getIO, initializeSocket } from "../src/websocket/socket";

const ids = Array.from({ length: 4 }, (_, index) =>
    `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`
);
const leagues = new LeaguesService();
const members = new LeagueMembersService();
const lobbies = new LobbiesService();
const server = http.createServer();
const io = initializeSocket(server, async token => {
    if (token === "invalid") {
        throw new Error("Invalid token");
    }
    return { id: token, email: `${token}@test.local` };
});

before(async () => {
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
});

beforeEach(async () => {
    await db.query("TRUNCATE match_votes, match_players, matches, lobby_players, lobbies, league_join_requests, standings, league_members, leagues, riot_accounts, users RESTART IDENTITY CASCADE");
    for (const [index, id] of ids.entries()) {
        await db.query(
            "INSERT INTO users (id, email, nickname) VALUES ($1, $2, $3)",
            [id, `socket-user${index + 1}@test.local`, `socket-user${index + 1}`]
        );
    }
});

after(async () => {
    io.close();
    await db.end();
});

function socketUrl() {
    const address = server.address();
    if (!address || typeof address === "string") {
        throw new Error("Socket server is not listening");
    }
    return `http://127.0.0.1:${address.port}`;
}

async function connect(token?: string): Promise<ClientSocket> {
    const socket = createClient(socketUrl(), {
        auth: token ? { token } : {},
        transports: ["websocket"],
        reconnection: false
    });
    await new Promise<void>((resolve, reject) => {
        socket.once("connect", resolve);
        socket.once("connect_error", reject);
    });
    return socket;
}

async function rejectedHandshake(token?: string) {
    const socket = createClient(socketUrl(), {
        auth: token ? { token } : {},
        transports: ["websocket"],
        reconnection: false
    });
    try {
        return await new Promise<Error>((resolve, reject) => {
            socket.once("connect", () => reject(new Error("Handshake unexpectedly succeeded")));
            socket.once("connect_error", resolve);
        });
    } finally {
        socket.disconnect();
    }
}

async function emitAck(socket: ClientSocket, event: string, id: string) {
    return new Promise<SocketActionResult>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Ack timeout for ${event}`)), 1_000);
        socket.emit(event, id, (result: SocketActionResult) => {
            clearTimeout(timeout);
            resolve(result);
        });
    });
}

async function waitForRoom(room: string, size: number) {
    const deadline = Date.now() + 1_000;
    while (Date.now() < deadline) {
        if ((getIO().sockets.adapter.rooms.get(room)?.size ?? 0) === size) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.equal(getIO().sockets.adapter.rooms.get(room)?.size ?? 0, size);
}

async function createPrivateLeague() {
    return leagues.create(ids[0], {
        ownerId: ids[0], name: "Socket league", visibility: "private",
        joinPolicy: "request", maxPlayers: 4
    });
}

describe("Socket.IO transport contracts", { concurrency: false }, () => {
    test("handshake rejects missing and invalid tokens", async () => {
        assert.match((await rejectedHandshake()).message, /token missing/i);
        assert.match((await rejectedHandshake("invalid")).message, /authentication failed/i);
    });

    test("league and lobby joins return deterministic authorization acknowledgements", async () => {
        const league = await createPrivateLeague();
        const lobby = await lobbies.create(league.id, ids[0], { maxPlayers: 2 });
        const owner = await connect(ids[0]);
        const outsider = await connect(ids[1]);
        try {
            assert.deepEqual(await emitAck(owner, SOCKET_EVENTS.LEAGUE_JOIN, league.id), { ok: true });
            assert.deepEqual(await emitAck(owner, SOCKET_EVENTS.LOBBY_JOIN, lobby.id), { ok: true });
            assert.equal((await emitAck(outsider, SOCKET_EVENTS.LEAGUE_JOIN, league.id)).ok, false);
            const lobbyDenied = await emitAck(outsider, SOCKET_EVENTS.LOBBY_JOIN, lobby.id);
            assert.deepEqual(lobbyDenied, {
                ok: false,
                error: { code: "FORBIDDEN", message: "League membership required" }
            });
        } finally {
            owner.disconnect();
            outsider.disconnect();
        }
    });

    test("database errors inside async handlers are acknowledged without unhandled rejection", async () => {
        const socket = await connect(ids[0]);
        const rejections: unknown[] = [];
        const onUnhandled = (reason: unknown) => rejections.push(reason);
        process.on("unhandledRejection", onUnhandled);
        try {
            const result = await emitAck(socket, SOCKET_EVENTS.LEAGUE_JOIN, "not-a-uuid");
            assert.deepEqual(result, {
                ok: false,
                error: { code: "INTERNAL_ERROR", message: "Realtime operation failed" }
            });
            await new Promise(resolve => setTimeout(resolve, 20));
            assert.deepEqual(rejections, []);
        } finally {
            process.off("unhandledRejection", onUnhandled);
            socket.disconnect();
        }
    });

    test("revocation removes multiple tabs and reconnect cannot regain rooms", async () => {
        const league = await createPrivateLeague();
        const member = await members.create(ids[0], league.id, ids[1], { role: "player" });
        const lobby = await lobbies.create(league.id, ids[0], { maxPlayers: 2 });
        const tabs = [await connect(ids[1]), await connect(ids[1])];
        try {
            for (const tab of tabs) {
                assert.equal((await emitAck(tab, SOCKET_EVENTS.LEAGUE_JOIN, league.id)).ok, true);
                assert.equal((await emitAck(tab, SOCKET_EVENTS.LOBBY_JOIN, lobby.id)).ok, true);
            }
            await waitForRoom(`league:${league.id}`, 2);
            await waitForRoom(`lobby:${lobby.id}`, 2);
            await members.remove(ids[0], league.id, member.id);
            await waitForRoom(`league:${league.id}`, 0);
            await waitForRoom(`lobby:${lobby.id}`, 0);
        } finally {
            tabs.forEach(tab => tab.disconnect());
        }

        const reconnect = await connect(ids[1]);
        try {
            const result = await emitAck(reconnect, SOCKET_EVENTS.LEAGUE_JOIN, league.id);
            assert.equal(result.ok, false);
            await waitForRoom(`league:${league.id}`, 0);
        } finally {
            reconnect.disconnect();
        }
    });

    test("authorized reconnect rejoins and receives the invalidation used for refetch", async () => {
        const league = await createPrivateLeague();
        const firstConnection = await connect(ids[0]);
        assert.equal((await emitAck(firstConnection, SOCKET_EVENTS.LEAGUE_JOIN, league.id)).ok, true);
        firstConnection.disconnect();

        const reconnect = await connect(ids[0]);
        try {
            assert.equal((await emitAck(reconnect, SOCKET_EVENTS.LEAGUE_JOIN, league.id)).ok, true);
            const invalidation = new Promise<{ leagueId: string; _meta: { correlationId: string } }>(resolve => {
                reconnect.once(SOCKET_EVENTS.LEAGUE_UPDATE, resolve);
            });
            SocketEmitter.emitToLeague(league.id, SOCKET_EVENTS.LEAGUE_UPDATE, { leagueId: league.id });
            const payload = await invalidation;
            assert.equal(payload.leagueId, league.id);
            assert.match(payload._meta.correlationId, /^[A-Za-z0-9._:-]+$/);
        } finally {
            reconnect.disconnect();
        }
    });
});
