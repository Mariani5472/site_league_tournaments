import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";
import { renderApp } from "@/test/renderApp";
import { LeagueSettingsPage } from "./LeagueSettingsPage";

const state = vi.hoisted(() => ({
    league: {
        data: { id: "league-1", name: "League", description: "", visibility: "private", joinPolicy: "request", maxPlayers: 10 },
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
    return <Routes>
        <Route path="/leagues/:id/settings" element={<LeagueSettingsPage />} />
        <Route path="/leagues/:id" element={<p>League page</p>} />
    </Routes>;
}

describe("LeagueSettingsPage authorization", () => {
    beforeEach(() => {
        state.league.isLoading = false;
        state.members.isLoading = false;
        state.members.data = [];
    });

    it("waits for members before deciding whether to redirect", () => {
        state.members.isLoading = true;

        renderApp(page(), { route: "/leagues/league-1/settings" });

        expect(screen.getByText("Loading...")).toBeVisible();
        expect(screen.queryByText("League page")).not.toBeInTheDocument();
    });

    it("keeps a legitimate admin on settings after members load", () => {
        state.members.data = [{ userId: "user-1", role: "admin" }];

        renderApp(page(), { route: "/leagues/league-1/settings" });

        expect(screen.getByRole("heading", { name: /editar liga/i })).toBeVisible();
        expect(screen.queryByText("League page")).not.toBeInTheDocument();
    });

    it("redirects a non-admin only after authorization data loads", () => {
        state.members.data = [{ userId: "user-1", role: "player" }];

        renderApp(page(), { route: "/leagues/league-1/settings" });

        expect(screen.getByText("League page")).toBeVisible();
    });
});
