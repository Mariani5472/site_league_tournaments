import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/renderApp";
import { LobbyActions } from "./LobbyActions";
import { TeamSelection } from "./TeamSelection";
import type { LobbyDetails } from "../types/lobby.types";

function completedLobby(): LobbyDetails {
    return {
        id: "lobby-1", leagueId: "league-1", matchId: null, status: "waiting",
        maxPlayers: 10, playersCount: 10, readyCount: 3, availableSlots: 0,
        isFull: true, isBalanced: true, everyoneReady: false, canStart: false,
        currentPlayer: { userId: "user-1", teamNumber: 1, isReady: false },
        players: [], teams: { team1: { count: 5, players: [] }, team2: { count: 5, players: [] } },
        teamSelection: {
            available: true, canVote: true, mode: "random", completed: true,
            majorityRequired: 6, myVote: "random", votes: { random: 6, balanced: 0, player_picks: 0 },
            round: 1, confirmation: null, captainVote: null, draft: null,
        },
    };
}

describe("lobby critical controls", () => {
    it("separates accepted teams from individual readiness", () => {
        renderApp(<TeamSelection lobby={completedLobby()} />);
        expect(screen.getByText(/aceitar os times não confirma/i)).toBeVisible();
        expect(screen.getByText(/3\/10 jogadores prontos/i)).toBeVisible();
    });

    it("exposes an explicit ready action only after selection unlocks", async () => {
        const ready = vi.fn();
        const switchTeam = vi.fn();
        const props = {
            currentPlayer: { userId: "user-1", nickname: "Player", avatarUrl: null, teamNumber: 1 as const, isReady: false },
            join: vi.fn(), leave: vi.fn(), ready, unready: vi.fn(), switchTeam, deleteLobby: vi.fn(),
            status: "waiting" as const, canManage: false,
        };
        const { rerender } = renderApp(<LobbyActions {...props} teamSelectionLocked />);
        expect(screen.getByRole("button", { name: /confirmar prontidão/i })).toBeDisabled();
        rerender(<LobbyActions {...props} teamSelectionLocked={false} />);
        await userEvent.click(screen.getByRole("button", { name: /confirmar prontidão/i }));
        expect(ready).toHaveBeenCalledOnce();
        await userEvent.click(screen.getByRole("button", { name: /switch to team/i }));
        expect(switchTeam).toHaveBeenCalledOnce();
    });
});
