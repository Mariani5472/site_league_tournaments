import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { uniqueItems } from "@/types/pagination";
import { queryKeys } from "@/lib/queryKeys";
import {
    getOpsLeague,
    getOpsSession,
    getOpsUser,
    listOpsLeagues,
    listOpsUsers,
    suspendOpsUser,
    unsuspendOpsUser,
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

export function useOpsUserContainment(userId: string) {
    const queryClient = useQueryClient();
    const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.ops.user(userId) });
    return {
        suspend: useMutation({
            mutationFn: (input: { reason: string; suspendedUntil: string }) =>
                suspendOpsUser(userId, input),
            onSuccess: refresh,
        }),
        unsuspend: useMutation({
            mutationFn: (reason: string) => unsuspendOpsUser(userId, reason),
            onSuccess: refresh,
        }),
    };
}

export function useOpsLeague(leagueId: string) {
    return useQuery({
        queryKey: queryKeys.ops.league(leagueId),
        queryFn: () => getOpsLeague(leagueId),
    });
}
