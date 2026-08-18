import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/renderApp";
import { DashboardPage } from "./DashboardPage";

const dashboard = vi.hoisted(() => ({
    data: undefined as unknown,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
}));
vi.mock("../useDashboard", () => ({ useDashboard: () => dashboard }));
vi.mock("@/modules/leagues/components/CreateLeagueDialog", () => ({
    CreateLeagueDialog: () => <button>Criar liga</button>,
}));

describe("DashboardPage", () => {
    beforeEach(() => {
        localStorage.removeItem("fpl-lol-onboarding:user-1");
        Object.assign(dashboard, { data: undefined, isLoading: false, isError: false });
    });

    it("offers useful actions when the personal dashboard is empty", () => {
        dashboard.data = {
            summary: { leagueCount: 0, matchesPlayed: 0, wins: 0, losses: 0 },
            actions: [],
            recentLeagues: [],
            recentMatches: [],
        };
        renderApp(<DashboardPage />);
        expect(screen.getAllByRole("button", { name: "Criar liga" }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole("link", { name: /explorar ligas/i }).length).toBeGreaterThan(0);
    });

    it("offers and persists dismissal of first-login next steps", async () => {
        const user = userEvent.setup();
        dashboard.data = {
            summary: { leagueCount: 0, matchesPlayed: 0, wins: 0, losses: 0 },
            actions: [],
            recentLeagues: [],
            recentMatches: [],
        };
        renderApp(<DashboardPage />);

        expect(screen.getByRole("link", { name: /completar perfil/i })).toHaveAttribute(
            "href",
            "/profile"
        );
        expect(screen.getByRole("link", { name: /descobrir uma liga/i })).toHaveAttribute(
            "href",
            "/leagues"
        );
        await user.click(screen.getByRole("button", { name: /fechar primeiros passos/i }));
        expect(localStorage.getItem("fpl-lol-onboarding:user-1")).toBe("done");
        expect(screen.queryByText("Prepare sua experiência na plataforma")).not.toBeInTheDocument();
    });

    it("shows a real pending action and clearly scoped personal stats", () => {
        dashboard.data = {
            summary: { leagueCount: 1, matchesPlayed: 3, wins: 2, losses: 1 },
            actions: [
                {
                    id: "match-1",
                    type: "vote_pending",
                    leagueId: "league-1",
                    leagueName: "Liga A",
                    lobbyId: "lobby-1",
                    matchId: "match-1",
                    count: null,
                    href: "/leagues/league-1/lobbies/lobby-1",
                },
            ],
            recentLeagues: [
                {
                    id: "league-1",
                    name: "Liga A",
                    description: null,
                    playerCount: 10,
                    maxPlayers: 20,
                    role: "player",
                },
            ],
            recentMatches: [],
        };
        renderApp(<DashboardPage />);
        expect(
            screen.getByRole("link", { name: /registrar seu voto na partida de Liga A/i })
        ).toHaveAttribute("href", "/leagues/league-1/lobbies/lobby-1");
        expect(screen.getByText("Minhas partidas finalizadas")).toBeVisible();
        expect(screen.queryByText(/jogadores conectados/i)).not.toBeInTheDocument();
    });
});
