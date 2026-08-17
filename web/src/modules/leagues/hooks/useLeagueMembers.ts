import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getLeagueMembers } from "../services/leagues.service";
import { uniqueItems } from "@/types/pagination";
export function useLeagueMembers(leagueId: string, enabled = true) {
    const query = useInfiniteQuery({
        queryKey: queryKeys.leagues.members(leagueId),
        queryFn: ({ pageParam }) => getLeagueMembers(leagueId, pageParam),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: page => page.nextCursor ?? undefined,
        enabled,
    });
    return { ...query, data: uniqueItems(query.data?.pages) };
}
