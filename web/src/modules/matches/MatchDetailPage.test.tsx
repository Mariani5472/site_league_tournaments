import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/renderApp";
import { Route, Routes } from "react-router-dom";
import { MatchDetailPage } from "./MatchDetailPage";

const getMatch = vi.hoisted(() => vi.fn());
vi.mock("./services", () => ({ getMatch }));

describe("MatchDetailPage", () => {
    beforeEach(() =>
        getMatch.mockResolvedValue({
            id: "match-1",
            leagueId: "league-1",
            lobbyId: "lobby-1",
            status: "finished",
            winnerTeamNumber: 1,
            resolutionType: "vote",
            resolutionReason: null,
            startedAt: "2026-01-02T12:00:00.000Z",
            finishedAt: "2026-01-02T13:00:00.000Z",
            players: [
                { userId: "user-1", nickname: "Ana", teamNumber: 1, result: "win" },
                { userId: "user-2", nickname: "Bia", teamNumber: 2, result: "loss" },
            ],
            votes: { team1: 2, team2: 1, total: 3 },
            majorityRequired: 2,
        })
    );

    it("shows teams, winner, aggregated votes and post-match navigation", async () => {
        renderApp(
            <Routes>
                <Route path="/matches/:matchId" element={<MatchDetailPage />} />
            </Routes>,
            { route: "/matches/match-1" }
        );
        expect(await screen.findByRole("heading", { name: "Detalhes da partida" })).toBeVisible();
        expect(screen.getByText("Time 1: 2")).toBeVisible();
        expect(screen.getByText("Total: 3")).toBeVisible();
        expect(screen.getByRole("link", { name: "Ana" })).toHaveAttribute(
            "href",
            "/players/user-1"
        );
        expect(screen.getByRole("link", { name: /ver classificação/i })).toHaveAttribute(
            "href",
            "/leagues/league-1#standings"
        );
        expect(screen.queryByText(/voto de/i)).not.toBeInTheDocument();
    });
});
