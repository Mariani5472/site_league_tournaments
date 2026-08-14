import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { Socket } from "socket.io";
import { registerLeagueSocket } from "../src/modules/leagues/leagues.socket";
import { registerLobbySocket } from "../src/modules/lobbies/lobbies.socket";
import { drainSocketActions, type SocketActionResult } from "../src/websocket/socket-action";
import { SOCKET_EVENTS } from "../src/websocket/socket-events";

type Handler = (payload: unknown, ack: (result: SocketActionResult) => void) => void;

function fakeSocket() {
    const handlers = new Map<string, Handler>();
    const socket = {
        data: { user: { id: "30000000-0000-4000-8000-000000000001" } },
        on(event: string, handler: Handler) { handlers.set(event, handler); return socket; },
        emit() { return true; }
    } as unknown as Socket;
    return { socket, handlers };
}

async function invoke(handler: Handler | undefined, payload: unknown) {
    assert(handler);
    const result = new Promise<SocketActionResult>(resolve => handler(payload, resolve));
    await drainSocketActions();
    return result;
}

afterEach(() => {
    delete process.env.SOCKET_EVENT_PAYLOAD_MAX_BYTES;
});

describe("Socket event payload validation", () => {
    it("rejects invalid league and lobby UUIDs before repository queries", async () => {
        let leagueQueries = 0;
        let lobbyQueries = 0;
        const leagueSocket = fakeSocket();
        registerLeagueSocket(leagueSocket.socket, {
            leagueMembersRepository: {
                findByLeagueAndUser: async () => { leagueQueries += 1; return null; }
            } as never
        });
        const lobbySocket = fakeSocket();
        registerLobbySocket(lobbySocket.socket, {
            lobbiesRepository: {
                findById: async () => { lobbyQueries += 1; return null; }
            } as never,
            leagueMembersRepository: {
                findByLeagueAndUser: async () => { lobbyQueries += 1; return null; }
            } as never
        });

        const expected = {
            ok: false,
            error: { code: "VALIDATION_ERROR", message: "Invalid realtime payload" }
        };
        assert.deepEqual(await invoke(leagueSocket.handlers.get(SOCKET_EVENTS.LEAGUE_JOIN), "not-a-uuid"), expected);
        assert.deepEqual(await invoke(lobbySocket.handlers.get(SOCKET_EVENTS.LOBBY_JOIN), "not-a-uuid"), expected);
        assert.equal(leagueQueries, 0);
        assert.equal(lobbyQueries, 0);
    });

    it("rejects an excessive payload deterministically before querying", async () => {
        process.env.SOCKET_EVENT_PAYLOAD_MAX_BYTES = "64";
        let queries = 0;
        const fixture = fakeSocket();
        registerLeagueSocket(fixture.socket, {
            leagueMembersRepository: {
                findByLeagueAndUser: async () => { queries += 1; return null; }
            } as never
        });

        assert.deepEqual(await invoke(
            fixture.handlers.get(SOCKET_EVENTS.LEAGUE_JOIN),
            "x".repeat(1_000)
        ), {
            ok: false,
            error: { code: "VALIDATION_ERROR", message: "Invalid realtime payload" }
        });
        assert.equal(queries, 0);
    });
});
