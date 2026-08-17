import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { uniqueItems } from "@/types/pagination";
import { discoverPlayers } from "../services/profile.service";

export function useDiscoverPlayers(search: string) {
    const query = useInfiniteQuery({
        queryKey: queryKeys.profile.discover(search),
        queryFn: ({ pageParam }) => discoverPlayers(search, pageParam),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: page => page.nextCursor ?? undefined,
    });
    return { ...query, data: uniqueItems(query.data?.pages) };
}
