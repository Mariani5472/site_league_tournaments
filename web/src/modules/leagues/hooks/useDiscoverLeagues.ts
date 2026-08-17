import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getDiscoverLeagues } from "../services/leagues.service";
import { uniqueItems } from "@/types/pagination";
export function useDiscoverLeagues(search?: string) {
    const query = useInfiniteQuery({
        queryKey: queryKeys.leagues.discover(search),
        queryFn: ({ pageParam }) => getDiscoverLeagues(search, pageParam),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: page => page.nextCursor ?? undefined,
    });
    return { ...query, data: uniqueItems(query.data?.pages) };
}
