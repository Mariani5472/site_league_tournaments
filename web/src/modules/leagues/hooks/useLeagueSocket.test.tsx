import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp, testQueryClient } from "@/test/renderApp";
import { queryKeys } from "@/lib/queryKeys";
import { SOCKET_EVENTS } from "@/services/socket-events";
import { useLeagueSocket } from "./useLeagueSocket";

type Handler = (payload?: { leagueId: string; matchId?: string }) => void;
const realtime = vi.hoisted(() => {
    const handlers = new Map<string, Set<Handler>>();
    return {
        handlers,
        on: vi.fn((event: string, handler: Handler) => {
            const eventHandlers = handlers.get(event) ?? new Set<Handler>();
            eventHandlers.add(handler);
            handlers.set(event, eventHandlers);
        }),
        off: vi.fn((event: string, handler: Handler) => handlers.get(event)?.delete(handler)),
        emit: vi.fn((event: string, _payload: unknown, ack?: (result: { ok: true }) => void) => {
            if (event === "league:join") ack?.({ ok: true });
        }),
    };
});

vi.mock("@/services/socket", () => ({ socket: realtime }));

function Harness() {
    useLeagueSocket("league-1");
    return null;
}

function dispatch(event: string, payload?: { leagueId: string; matchId?: string }) {
    realtime.handlers.get(event)?.forEach(handler => handler(payload));
}

describe("useLeagueSocket match reconciliation", () => {
    beforeEach(() => realtime.handlers.clear());

    it("invalidates the match detail when a realtime match event arrives", async () => {
        const queryClient = testQueryClient();
        const invalidate = vi.spyOn(queryClient, "invalidateQueries");
        renderApp(<Harness />, { queryClient });
        invalidate.mockClear();

        dispatch(SOCKET_EVENTS.MATCH_VOTE, { leagueId: "league-1", matchId: "match-1" });

        await waitFor(() => expect(invalidate).toHaveBeenCalledWith({
            queryKey: queryKeys.matches.detail("match-1")
        }));
    });

    it("invalidates active match queries after a successful socket rejoin", async () => {
        const queryClient = testQueryClient();
        const invalidate = vi.spyOn(queryClient, "invalidateQueries");
        renderApp(<Harness />, { queryClient });
        invalidate.mockClear();

        dispatch("connect");

        await waitFor(() => expect(invalidate).toHaveBeenCalledWith({
            queryKey: queryKeys.matches.all
        }));
    });
});
