import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";
import { renderApp } from "@/test/renderApp";
import { LeagueSettingsPage } from "./LeagueSettingsPage";

const state = vi.hoisted(() => ({
    league: {
        data: {
            id: "league-1",
            name: "League",
            description: "",
            visibility: "private",
            joinPolicy: "request",
            maxPlayers: 10,
            lobbyCreationPolicy: "admins" as "admins" | "members",
            autoStartLobby: false,
        },
        isLoading: false,
    },
    members: { data: [] as Array<{ userId: string; role: string }>, isLoading: false },
}));

vi.mock("../hooks/useLeague", () => ({ useLeague: () => state.league }));
vi.mock("../hooks/useLeagueMembers", () => ({ useLeagueMembers: () => state.members }));
vi.mock("../hooks/useUpdateLeague", () => ({
    useUpdateLeague: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("../components/DangerZone", () => ({ DangerZone: () => <p>Danger zone</p> }));

function page() {
    return (
        <Routes>
            <Route path="/leagues/:id/settings" element={<LeagueSettingsPage />} />
            <Route path="/leagues/:id" element={<p>League page</p>} />
        </Routes>
    );
}

describe("LeagueSettingsPage authorization", () => {
    beforeEach(() => {
        state.league.isLoading = false;
        state.members.isLoading = false;
        state.members.data = [];
        state.league.data.lobbyCreationPolicy = "admins";
    });

    it("waits for members before deciding whether to redirect", () => {
        state.members.isLoading = true;

        renderApp(page(), { route: "/leagues/league-1/settings" });

        expect(screen.getByText("Carregando…")).toBeVisible();
        expect(screen.queryByText("League page")).not.toBeInTheDocument();
    });

    it("keeps a legitimate admin on settings after members load", () => {
        state.members.data = [{ userId: "user-1", role: "admin" }];

        renderApp(page(), { route: "/leagues/league-1/settings" });

        expect(screen.getByRole("heading", { name: /editar liga/i })).toBeVisible();
        expect(screen.queryByText("League page")).not.toBeInTheDocument();
    });

    it.each([
        ["admins", "Somente owner e admins"],
        ["members", "Todos os membros"],
    ] as const)("fills the lobby creation policy with %s", async (policy, label) => {
        state.members.data = [{ userId: "user-1", role: "admin" }];
        state.league.data.lobbyCreationPolicy = policy;

        renderApp(page(), { route: "/leagues/league-1/settings" });

        await waitFor(() => {
            expect(
                screen.getByRole("combobox", { name: /quem pode criar lobbies/i })
            ).toHaveTextContent(label);
        });
    });

    it("redirects a non-admin only after authorization data loads", () => {
        state.members.data = [{ userId: "user-1", role: "player" }];

        renderApp(page(), { route: "/leagues/league-1/settings" });

        expect(screen.getByText("League page")).toBeVisible();
    });
});
