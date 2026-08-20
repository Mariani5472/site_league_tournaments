import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { uniqueItems } from "@/types/pagination";
import { queryKeys } from "@/lib/queryKeys";
import {
    getOpsLeague,
    getOpsSession,
    getOpsUser,
    listOpsLeagues,
    listOpsUsers,
} from "./ops.service";

export function useOpsSession() {
    return useQuery({ queryKey: queryKeys.ops.session, queryFn: getOpsSession, retry: false });
}

export function useOpsUsers(search: string) {
    const query = useInfiniteQuery({
        queryKey: queryKeys.ops.users(search),
        queryFn: ({ pageParam }) => listOpsUsers(search, pageParam),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: page => page.nextCursor ?? undefined,
    });
    return { ...query, data: uniqueItems(query.data?.pages) };
}

export function useOpsLeagues(search: string) {
    const query = useInfiniteQuery({
        queryKey: queryKeys.ops.leagues(search),
        queryFn: ({ pageParam }) => listOpsLeagues(search, pageParam),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: page => page.nextCursor ?? undefined,
    });
    return { ...query, data: uniqueItems(query.data?.pages) };
}

export function useOpsUser(userId: string) {
    return useQuery({ queryKey: queryKeys.ops.user(userId), queryFn: () => getOpsUser(userId) });
}

export function useOpsLeague(leagueId: string) {
    return useQuery({
        queryKey: queryKeys.ops.league(leagueId),
        queryFn: () => getOpsLeague(leagueId),
    });
}
