import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/renderApp";
import { MatchVoting } from "./MatchVoting";

const services = vi.hoisted(() => ({ getMatch: vi.fn(), voteMatch: vi.fn(), resolveMatch: vi.fn() }));
vi.mock("./services", () => services);

const match = {
    id: "match-1", leagueId: "league-1", lobbyId: "lobby-1", status: "in_game" as const,
    winnerTeamNumber: null, resolutionType: null, resolutionReason: null,
    startedAt: "2026-01-01", finishedAt: null, players: [], majorityRequired: 3,
    votes: { team1: 1, team2: 0, total: 1 }, myVote: 1 as const,
};

describe("MatchVoting", () => {
    beforeEach(() => {
        services.getMatch.mockResolvedValue(match);
        services.voteMatch.mockResolvedValue({ ...match, myVote: 2 });
    });

    it("shows loading and then the user's current vote", async () => {
        renderApp(<MatchVoting matchId="match-1" canResolve={false} />);
        expect(screen.getByText(/carregando partida/i)).toBeVisible();
        expect(await screen.findByText(/your current vote: team 1/i)).toBeVisible();
        expect(screen.queryByText(/resolve a contested/i)).not.toBeInTheDocument();
    });

    it("submits a changed vote through the observable action", async () => {
        renderApp(<MatchVoting matchId="match-1" canResolve={false} />);
        await userEvent.click(await screen.findByRole("button", { name: /vote team 2/i }));
        expect(services.voteMatch).toHaveBeenCalledWith("match-1", 2);
    });
});
