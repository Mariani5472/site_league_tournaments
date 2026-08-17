import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { Socket } from "socket.io";
import { registerLeagueSocket } from "../src/modules/leagues/leagues.socket";
import { registerLobbySocket } from "../src/modules/lobbies/lobbies.socket";
import { drainSocketActions, type SocketActionResult } from "../src/websocket/socket-action";
import { SOCKET_EVENTS } from "../src/websocket/socket-events";
import { observabilityContext } from "../src/observability/context";
import { logger } from "../src/observability/logger";

type Handler = (payload: unknown, ack: (result: SocketActionResult) => void) => void;

function fakeSocket() {
    const handlers = new Map<string, Handler>();
    const socket = {
        data: { user: { id: "30000000-0000-4000-8000-000000000001" } },
        id: "socket-test-1",
        on(event: string, handler: Handler) { handlers.set(event, handler); return socket; },
        leave: async () => undefined,
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

describe("Socket event payload validation", { concurrency: false }, () => {
    it("releases a waiting lobby place when leaving its realtime room", async () => {
        const fixture = fakeSocket();
        let released: { lobbyId: string; userId: string } | undefined;
        registerLobbySocket(fixture.socket, {
            releasePresence: async (lobbyId, userId) => {
                released = { lobbyId, userId };
            },
        });
        const lobbyId = "40000000-0000-4000-8000-000000000001";

        const result = await invoke(fixture.handlers.get(SOCKET_EVENTS.LOBBY_LEAVE), lobbyId);

        assert.equal(result.ok, true);
        assert.deepEqual(released, {
            lobbyId,
            userId: "30000000-0000-4000-8000-000000000001",
        });
    });

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

        const leagueResult = await invoke(leagueSocket.handlers.get(SOCKET_EVENTS.LEAGUE_JOIN), "not-a-uuid");
        const lobbyResult = await invoke(lobbySocket.handlers.get(SOCKET_EVENTS.LOBBY_JOIN), "not-a-uuid");
        for (const result of [leagueResult, lobbyResult]) {
            assert.deepEqual(result.error, { code: "VALIDATION_ERROR", message: "Invalid realtime payload" });
            assert.match(result._meta.correlationId, /^[A-Za-z0-9._:-]+$/);
        }
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

        const result = await invoke(
            fixture.handlers.get(SOCKET_EVENTS.LEAGUE_JOIN),
            "x".repeat(1_000)
        );
        assert.deepEqual(result.error, { code: "VALIDATION_ERROR", message: "Invalid realtime payload" });
        assert.match(result._meta.correlationId, /^[A-Za-z0-9._:-]+$/);
        assert.equal(queries, 0);
    });

    it("shares the action context between an unexpected failure, its log and ack", async () => {
        let actionContext: ReturnType<typeof observabilityContext>;
        let logContext: Record<string, unknown> | undefined;
        const originalError = logger.error;
        logger.error = ((context: Record<string, unknown>) => { logContext = context; }) as typeof logger.error;
        try {
            const fixture = fakeSocket();
            registerLeagueSocket(fixture.socket, {
                leagueMembersRepository: {
                    findByLeagueAndUser: async () => {
                        actionContext = observabilityContext();
                        throw new Error("database details that must not be logged");
                    }
                } as never
            });

            const result = await invoke(
                fixture.handlers.get(SOCKET_EVENTS.LEAGUE_JOIN),
                "30000000-0000-4000-8000-000000000002"
            );

            assert.equal(result.ok, false);
            assert.equal(result.error.code, "INTERNAL_ERROR");
            assert.equal(actionContext?.requestId, result._meta.correlationId);
            assert.equal(logContext?.requestId, result._meta.correlationId);
            assert.equal(logContext?.operation, SOCKET_EVENTS.LEAGUE_JOIN);
            assert.equal(logContext?.userId, "30000000-0000-4000-8000-000000000001");
            assert.equal(logContext?.socketId, "socket-test-1");
            assert.equal(logContext?.errorType, "Error");
            assert.equal(JSON.stringify(logContext).includes("database details"), false);
            assert.equal(JSON.stringify(logContext).includes("token"), false);
        } finally {
            logger.error = originalError;
        }
    });
});
