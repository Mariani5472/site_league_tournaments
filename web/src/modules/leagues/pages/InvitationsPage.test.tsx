import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/renderApp";
import { InvitationsPage } from "./InvitationsPage";

const state = {
    data: [
        {
            id: "invite-1",
            leagueId: "league-1",
            recipientId: "user-1",
            invitedBy: "owner-1",
            status: "pending" as const,
            leagueName: "Liga fechada",
            inviterNickname: "capitao",
            createdAt: "2026-08-18T12:00:00Z",
        },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    fetchNextPage: vi.fn(),
};
const respondToInvitation = vi.fn();
vi.mock("../hooks/useLeagueInvitations", () => ({ useLeagueInvitations: () => state }));
vi.mock("../services/leagues.service", () => ({
    respondToInvitation: (...args: unknown[]) => respondToInvitation(...args),
}));

describe("InvitationsPage", () => {
    beforeEach(() => respondToInvitation.mockReset().mockResolvedValue({ status: "accepted" }));

    it("lets the recipient explicitly accept a persisted invitation", async () => {
        renderApp(<InvitationsPage />);

        expect(screen.getByText("Liga fechada")).toBeVisible();
        expect(screen.getByText("Convite enviado por capitao.")).toBeVisible();
        await userEvent.click(screen.getByRole("button", { name: "Aceitar convite" }));
        expect(respondToInvitation).toHaveBeenCalledWith("invite-1", "accepted");
    });
});
