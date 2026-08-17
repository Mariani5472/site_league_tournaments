import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "@/test/renderApp";
import type { LobbyDetails } from "../types/lobby.types";
import { LobbyPhaseHeader } from "./LobbyPhaseHeader";

const lobby = {
    id: "lobby-1",
    leagueId: "league-1",
    matchId: null,
    status: "waiting",
    maxPlayers: 4,
    playersCount: 2,
    readyCount: 1,
    availableSlots: 2,
    isFull: false,
    isBalanced: true,
    everyoneReady: false,
    canStart: false,
    currentPlayer: null,
    players: [],
    teams: { team1: { count: 1, players: [] }, team2: { count: 1, players: [] } },
    teamSelection: null,
} satisfies LobbyDetails;

describe("LobbyPhaseHeader", () => {
    it("shows the active phase, concrete blockers and realtime loss", () => {
        renderApp(<LobbyPhaseHeader lobby={lobby} realtimeStatus="disconnected" />);
        expect(screen.getByText("Reunindo jogadores").closest("li")).toHaveAttribute(
            "aria-current",
            "step"
        );
        expect(screen.getByText(/faltam 2 jogadores/i)).toBeVisible();
        expect(screen.getByText(/faltam 1 confirmações/i)).toBeVisible();
        expect(screen.getByRole("status")).toHaveTextContent(/tentando reconectar/i);
    });
});
