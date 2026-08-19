import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "@/test/renderApp";
import type { PublicProfile } from "../types/profile";
import { PlayerProfileView } from "./PlayerProfileView";

const profile: PublicProfile = {
    id: "user-1",
    nickname: "Jogador",
    avatarUrl: "https://img.test/broken-avatar.png",
    bannerUrl: "https://img.test/broken-banner.png",
    createdAt: "2026-01-02T12:00:00.000Z",
    stats: {
        matchesPlayed: 6,
        wins: 3,
        losses: 3,
        recentForm: ["loss", "loss", "win", "win", "loss"],
        currentStreakResult: "loss",
        currentStreak: 2,
    },
    publicLeagues: [
        { id: "league-1", name: "Liga pública", description: null, playerCount: 3, maxPlayers: 10 },
    ],
    recentMatches: [
        {
            id: "match-1",
            leagueId: "league-1",
            leagueName: "Liga pública",
            startedAt: "2026-01-03T12:00:00.000Z",
            finishedAt: "2026-01-03T13:00:00.000Z",
            teamNumber: 1,
            result: "win",
        },
    ],
};

describe("PlayerProfileView", () => {
    it("renders only platform data and keeps fallbacks when remote images fail", () => {
        renderApp(<PlayerProfileView profile={profile} />);
        expect(screen.getByRole("heading", { name: "Jogador" })).toBeVisible();
        expect(screen.getByText("JO")).toBeVisible();
        expect(screen.getAllByText("Liga pública")).toHaveLength(2);
        expect(screen.getByText("2 derrotas seguidas")).toBeVisible();
        const recentForm = screen.getByRole("list", { name: "Últimos 5 resultados" });
        expect(within(recentForm).getAllByText("Vitória")).toHaveLength(2);
        expect(within(recentForm).getAllByText("Derrota")).toHaveLength(3);
        expect(screen.queryByRole("button", { name: /editar perfil/i })).not.toBeInTheDocument();

        fireEvent.error(screen.getByAltText("Avatar do perfil"));
        fireEvent.error(screen.getByAltText("Banner do perfil"));
        expect(screen.queryByAltText("Avatar do perfil")).not.toBeInTheDocument();
        expect(screen.queryByAltText("Banner do perfil")).not.toBeInTheDocument();
        expect(screen.getByText("JO")).toBeVisible();
    });
});
