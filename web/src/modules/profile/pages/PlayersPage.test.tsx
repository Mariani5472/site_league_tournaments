import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/renderApp";
import { PlayersPage } from "./PlayersPage";

const useDiscoverPlayers = vi.hoisted(() => vi.fn());
vi.mock("../hooks/useDiscoverPlayers", () => ({ useDiscoverPlayers }));

describe("PlayersPage", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        useDiscoverPlayers.mockReturnValue({
            data: [
                {
                    id: "user-2",
                    nickname: "Jogador",
                    avatarUrl: null,
                    publicLeagues: ["Liga pública"],
                    commonPublicLeagueCount: 1,
                },
            ],
            isLoading: false,
            isError: false,
            hasNextPage: false,
            isFetchingNextPage: false,
            isFetchNextPageError: false,
            fetchNextPage: vi.fn(),
        });
    });
    afterEach(() => vi.useRealTimers());

    it("debounces nickname search and links a safe result to its public profile", () => {
        renderApp(<PlayersPage />);
        expect(screen.getByRole("link", { name: /Jogador/ })).toHaveAttribute(
            "href",
            "/players/user-2"
        );
        fireEvent.change(screen.getByRole("textbox", { name: "Buscar por nickname" }), {
            target: { value: "maria" },
        });
        expect(useDiscoverPlayers).not.toHaveBeenLastCalledWith("maria");
        act(() => vi.advanceTimersByTime(300));
        expect(useDiscoverPlayers).toHaveBeenLastCalledWith("maria");
    });
});
