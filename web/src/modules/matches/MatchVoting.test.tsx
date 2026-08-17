import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/renderApp";
import { MatchVoting } from "./MatchVoting";

const services = vi.hoisted(() => ({
    getMatch: vi.fn(),
    voteMatch: vi.fn(),
    resolveMatch: vi.fn(),
}));
const realtime = vi.hoisted(() => ({ connected: true, on: vi.fn(), off: vi.fn() }));
vi.mock("./services", () => services);
vi.mock("@/services/socket", () => ({ socket: realtime }));

const match = {
    id: "match-1",
    leagueId: "league-1",
    lobbyId: "lobby-1",
    status: "in_game" as const,
    winnerTeamNumber: null,
    resolutionType: null,
    resolutionReason: null,
    startedAt: "2026-01-01",
    finishedAt: null,
    players: [],
    majorityRequired: 3,
    votes: { team1: 1, team2: 0, total: 1 },
    myVote: 1 as const,
};

describe("MatchVoting", () => {
    beforeEach(() => {
        realtime.connected = true;
        services.getMatch.mockResolvedValue(match);
        services.voteMatch.mockResolvedValue({ ...match, myVote: 2 });
    });

    it("shows loading and then the user's current vote", async () => {
        renderApp(<MatchVoting matchId="match-1" canResolve={false} />);
        expect(screen.getByText(/carregando partida/i)).toBeVisible();
        expect(await screen.findByText(/seu voto atual: time 1/i)).toBeVisible();
        expect(screen.queryByText(/resolver resultado contestado/i)).not.toBeInTheDocument();
    });

    it("submits a changed vote through the observable action", async () => {
        renderApp(<MatchVoting matchId="match-1" canResolve={false} />);
        await userEvent.click(await screen.findByRole("button", { name: /votar no time 2/i }));
        expect(services.voteMatch).toHaveBeenCalledWith("match-1", 2);
    });

    it("does not schedule match polling while realtime is connected", async () => {
        const intervals = vi.spyOn(globalThis, "setInterval");
        renderApp(<MatchVoting matchId="match-1" canResolve={false} />);
        expect(await screen.findByText(/seu voto atual: time 1/i)).toBeVisible();
        expect(intervals).not.toHaveBeenCalledWith(expect.any(Function), 15_000);
    });

    it("schedules the documented polling fallback while realtime is disconnected", async () => {
        realtime.connected = false;
        const intervals = vi.spyOn(globalThis, "setInterval");
        renderApp(<MatchVoting matchId="match-1" canResolve={false} />);
        expect(await screen.findByText(/seu voto atual: time 1/i)).toBeVisible();
        expect(intervals).toHaveBeenCalledWith(expect.any(Function), 15_000);
    });
});
