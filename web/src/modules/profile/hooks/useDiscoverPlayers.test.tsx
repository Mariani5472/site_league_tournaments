import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testQueryClient } from "@/test/renderApp";
import { useDiscoverPlayers } from "./useDiscoverPlayers";

const discoverPlayers = vi.hoisted(() => vi.fn());
vi.mock("../services/profile.service", () => ({ discoverPlayers }));

describe("useDiscoverPlayers", () => {
    beforeEach(() => discoverPlayers.mockReset());

    it("loads cursor pages without duplicate players", async () => {
        discoverPlayers
            .mockResolvedValueOnce({
                items: [{ id: "player-2" }, { id: "player-1" }],
                nextCursor: "player-1",
            })
            .mockResolvedValueOnce({
                items: [{ id: "player-1" }, { id: "player-0" }],
                nextCursor: null,
            });
        const client = testQueryClient();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        );
        const { result } = renderHook(() => useDiscoverPlayers("player"), { wrapper });
        await waitFor(() => expect(result.current.data).toHaveLength(2));
        await act(() => result.current.fetchNextPage());
        await waitFor(() =>
            expect(result.current.data?.map(player => player.id)).toEqual([
                "player-2",
                "player-1",
                "player-0",
            ])
        );
        expect(discoverPlayers).toHaveBeenNthCalledWith(2, "player", "player-1");
    });
});
