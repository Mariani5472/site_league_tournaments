import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";
import { renderApp } from "@/test/renderApp";
import { LeaguePage } from "./LeaguePage";

const state = vi.hoisted(() => ({
    league: {
        data: {
            id: "league-1",
            name: "Test league",
            playerCount: 1,
            maxPlayers: 10,
            currentUserRole: "player" as "owner" | "admin" | "player" | "spec" | null,
        },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
    },
    members: { data: [] as unknown[], isLoading: false, isError: false, refetch: vi.fn() },
    lobbies: { data: [] as unknown[], isLoading: false, isError: false, refetch: vi.fn() },
    requests: { data: [] as unknown[], isLoading: false, isError: false, refetch: vi.fn() },
    role: { role: "player", isAdmin: false, isOwner: false },
}));

vi.mock("../hooks/useLeague", () => ({ useLeague: () => state.league }));
vi.mock("../hooks/useLeagueMembers", () => ({ useLeagueMembers: () => state.members }));
vi.mock("../hooks/useLeagueLobbies", () => ({ useLeagueLobbies: () => state.lobbies }));
vi.mock("../hooks/useLeagueRequests", () => ({ useLeagueRequests: () => state.requests }));
vi.mock("../hooks/useLeagueSocket", () => ({ useLeagueSocket: vi.fn() }));
vi.mock("../components/LeagueHeader", () => ({ LeagueHeader: () => <h1>Test league</h1> }));
vi.mock("../components/LeagueMembers", () => ({
    LeagueMembers: ({ members }: { members: unknown[] }) => <p>Members: {members.length}</p>,
}));
vi.mock("../components/LeagueRequests", () => ({
    LeagueRequests: ({ requests }: { requests: unknown[] }) => <p>Requests: {requests.length}</p>,
}));
vi.mock("../components/LeagueLobbySelection", () => ({
    LeagueLobbySection: ({ lobbies }: { lobbies: unknown[] }) => <p>Lobbies: {lobbies.length}</p>,
}));
vi.mock("../components/InvitePlayer", () => ({
    InvitePlayer: () => <p>Invite player</p>,
}));
vi.mock("@/modules/matches/LeagueResults", () => ({ LeagueResults: () => <p>League results</p> }));

function page() {
    return (
        <Routes>
            <Route path="/leagues/:id" element={<LeaguePage />} />
        </Routes>
    );
}

describe("LeaguePage", () => {
    beforeEach(() => {
        Object.assign(state.league, {
            data: {
                id: "league-1",
                name: "Test league",
                playerCount: 1,
                maxPlayers: 10,
                currentUserRole: "player",
            },
            isLoading: false,
            isError: false,
        });
        Object.assign(state.members, { data: [], isLoading: false, isError: false });
        Object.assign(state.lobbies, { data: [], isLoading: false, isError: false });
        Object.assign(state.requests, { data: [], isLoading: false, isError: false });
        Object.assign(state.role, { role: "player", isAdmin: false, isOwner: false });
    });

    it("renders the league loading state", () => {
        state.league.isLoading = true;
        renderApp(page(), { route: "/leagues/league-1" });
        expect(screen.getByText(/carregando liga/i)).toBeVisible();
    });

    it("renders a recoverable league error", () => {
        state.league.isError = true;
        renderApp(page(), { route: "/leagues/league-1" });
        expect(screen.getByRole("alert")).toBeVisible();
        expect(screen.getByRole("button", { name: /tentar novamente/i })).toBeVisible();
    });

    it("shows overview and keyboard-accessible internal navigation", () => {
        renderApp(page(), { route: "/leagues/league-1" });
        expect(screen.getByText("1 / 10")).toBeVisible();
        expect(screen.getByRole("link", { name: "Membros" })).toHaveAttribute(
            "href",
            "/leagues/league-1?tab=members"
        );
        expect(screen.queryByText(/Requests:/)).not.toBeInTheDocument();
    });

    it("preserves other query parameters when navigating tabs", () => {
        renderApp(page(), { route: "/leagues/league-1?source=dashboard" });
        expect(screen.getByRole("link", { name: "Partidas" })).toHaveAttribute(
            "href",
            "/leagues/league-1?source=dashboard&tab=matches"
        );
    });

    it("shows private join requests only to league administrators", () => {
        Object.assign(state.role, { role: "admin", isAdmin: true, isOwner: false });
        state.league.data.currentUserRole = "admin";
        state.requests.data = [{ id: "request-1" }];
        renderApp(page(), { route: "/leagues/league-1" });
        expect(screen.getByText("Requests: 1")).toBeVisible();
    });

    it("shows a membership gate instead of protected collection errors", () => {
        state.league.data.currentUserRole = null;
        renderApp(page(), { route: "/leagues/league-1" });
        expect(screen.getByText(/entre na liga para visualizar/i)).toBeVisible();
        expect(screen.queryByText(/Lobbies:/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Members:/)).not.toBeInTheDocument();
    });
});
