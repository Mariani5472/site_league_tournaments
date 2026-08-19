import { useEffect } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { socket } from "@/services/socket";
import { SOCKET_EVENTS } from "@/services/socket-events";
import { getMyInvitations } from "../services/leagues.service";

export function useLeagueInvitations() {
    const queryClient = useQueryClient();
    const query = useInfiniteQuery({
        queryKey: queryKeys.leagues.invitations,
        queryFn: ({ pageParam }) => getMyInvitations(pageParam),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: page => page.nextCursor ?? undefined,
        select: data => ({
            ...data,
            items: Array.from(
                new Map(
                    data.pages.flatMap(page => page.items).map(item => [item.id, item])
                ).values()
            ),
        }),
    });
    useEffect(() => {
        const refresh = () =>
            queryClient.invalidateQueries({ queryKey: queryKeys.leagues.invitations });
        socket.on(SOCKET_EVENTS.LEAGUE_INVITATIONS_UPDATE, refresh);
        socket.on("connect", refresh);
        return () => {
            socket.off(SOCKET_EVENTS.LEAGUE_INVITATIONS_UPDATE, refresh);
            socket.off("connect", refresh);
        };
    }, [queryClient]);
    return { ...query, data: query.data?.items ?? [] };
}
