import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getLeagueRequests } from "../services/leagues.service";
import { uniqueItems } from "@/types/pagination";
export function useLeagueRequests(leagueId: string, enabled = true) {
    const query = useInfiniteQuery({
        queryKey: queryKeys.leagues.requests(leagueId),
        queryFn: ({ pageParam }) => getLeagueRequests(leagueId, pageParam),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: page => page.nextCursor ?? undefined,
        enabled,
    });
    return { ...query, data: uniqueItems(query.data?.pages) };
}
