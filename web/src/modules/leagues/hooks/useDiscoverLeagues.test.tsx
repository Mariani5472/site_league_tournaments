import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testQueryClient } from "@/test/renderApp";
import { useDiscoverLeagues } from "./useDiscoverLeagues";

const getDiscoverLeagues = vi.hoisted(() => vi.fn());
vi.mock("../services/leagues.service", () => ({ getDiscoverLeagues }));

describe("useDiscoverLeagues pagination", () => {
    beforeEach(() => getDiscoverLeagues.mockReset());

    it("loads following pages without duplicates", async () => {
        getDiscoverLeagues
            .mockResolvedValueOnce({ items: [{ id: "league-2" }, { id: "league-1" }], nextCursor: "league-1" })
            .mockResolvedValueOnce({ items: [{ id: "league-1" }, { id: "league-0" }], nextCursor: null });
        const client = testQueryClient();
        const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
        const { result } = renderHook(() => useDiscoverLeagues("ranked"), { wrapper });
        await waitFor(() => expect(result.current.data).toHaveLength(2));

        await act(() => result.current.fetchNextPage());
        await waitFor(() => expect(result.current.data?.map(item => item.id)).toEqual(["league-2", "league-1", "league-0"]));
        expect(getDiscoverLeagues).toHaveBeenNthCalledWith(2, "ranked", "league-1");
        expect(result.current.hasNextPage).toBe(false);
    });

    it("starts a fresh cursor chain when the debounced filter changes", async () => {
        getDiscoverLeagues
            .mockResolvedValueOnce({ items: [{ id: "old" }], nextCursor: "old" })
            .mockResolvedValueOnce({ items: [{ id: "new" }], nextCursor: null });
        const client = testQueryClient();
        const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
        const { result, rerender } = renderHook(({ search }) => useDiscoverLeagues(search), { initialProps: { search: "old filter" }, wrapper });
        await waitFor(() => expect(result.current.data?.[0]?.id).toBe("old"));

        rerender({ search: "new filter" });
        await waitFor(() => expect(result.current.data?.[0]?.id).toBe("new"));
        expect(getDiscoverLeagues).toHaveBeenLastCalledWith("new filter", undefined);
    });
});
