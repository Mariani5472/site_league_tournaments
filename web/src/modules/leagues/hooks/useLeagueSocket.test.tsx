import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
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

function Harness({ enabled = true }: { enabled?: boolean }) {
    useLeagueSocket("league-1", enabled);
    return null;
}

function MembershipHarness() {
    const [enabled, setEnabled] = useState(false);
    useLeagueSocket("league-1", enabled);
    return <button onClick={() => setEnabled(true)}>Join membership</button>;
}

function dispatch(event: string, payload?: { leagueId: string; matchId?: string }) {
    realtime.handlers.get(event)?.forEach(handler => handler(payload));
}

describe("useLeagueSocket match reconciliation", () => {
    beforeEach(() => {
        realtime.handlers.clear();
        realtime.emit.mockClear();
    });

    it("invalidates the match detail when a realtime match event arrives", async () => {
        const queryClient = testQueryClient();
        const invalidate = vi.spyOn(queryClient, "invalidateQueries");
        renderApp(<Harness />, { queryClient });
        invalidate.mockClear();

        dispatch(SOCKET_EVENTS.MATCH_VOTE, { leagueId: "league-1", matchId: "match-1" });

        await waitFor(() =>
            expect(invalidate).toHaveBeenCalledWith({
                queryKey: queryKeys.matches.detail("match-1"),
            })
        );
    });

    it("invalidates active match queries after a successful socket rejoin", async () => {
        const queryClient = testQueryClient();
        const invalidate = vi.spyOn(queryClient, "invalidateQueries");
        renderApp(<Harness />, { queryClient });
        invalidate.mockClear();

        dispatch("connect");

        await waitFor(() =>
            expect(invalidate).toHaveBeenCalledWith({
                queryKey: queryKeys.matches.all,
            })
        );
    });

    it("joins the league room as soon as membership becomes active", async () => {
        renderApp(<MembershipHarness />);
        expect(realtime.emit).not.toHaveBeenCalledWith(
            SOCKET_EVENTS.LEAGUE_JOIN,
            "league-1",
            expect.any(Function)
        );
        await userEvent.click(screen.getByRole("button", { name: "Join membership" }));
        await waitFor(() =>
            expect(realtime.emit).toHaveBeenCalledWith(
                SOCKET_EVENTS.LEAGUE_JOIN,
                "league-1",
                expect.any(Function)
            )
        );
    });
});
