import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/renderApp";
import { InvitePlayer } from "./InvitePlayer";

const invitePlayer = vi.fn().mockResolvedValue({ id: "invite-1" });
vi.mock("@/modules/profile/hooks/useDiscoverPlayers", () => ({
    useDiscoverPlayers: (search: string) => ({
        data: search ? [{ id: "player-2", nickname: "convidado" }] : [],
        isLoading: false,
    }),
}));
vi.mock("../services/leagues.service", () => ({
    invitePlayer: (...args: unknown[]) => invitePlayer(...args),
}));

describe("InvitePlayer", () => {
    it("searches a platform player and sends an explicit invitation", async () => {
        renderApp(<InvitePlayer leagueId="league-1" />);

        await userEvent.type(screen.getByLabelText("Buscar jogador por nickname"), "convidado");
        expect(await screen.findByText("convidado")).toBeVisible();
        await userEvent.click(screen.getByRole("button", { name: "Convidar" }));
        expect(invitePlayer).toHaveBeenCalledWith("league-1", "player-2");
    });
});
