import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { socket } from "@/services/socket";
import { SOCKET_EVENTS } from "@/services/socket-events";
type LeagueEventPayload = {
    leagueId: string;
    matchId?: string;
};
type JoinAck = { ok: true } | { ok: false; error: { code: string; message: string } };
export function useLeagueSocket(leagueId: string) {
    const queryClient = useQueryClient();
    useEffect(() => {
        const reconcileLeague = () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.leagues.detail(leagueId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.leagues.members(leagueId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.leagues.lobbies(leagueId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.leagues.requests(leagueId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.leagues.matches(leagueId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.leagues.standings(leagueId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.matches.all });
        };
        const joinLeague = () => socket.emit(SOCKET_EVENTS.LEAGUE_JOIN, leagueId, (ack: JoinAck) => {
            if (ack.ok)
                reconcileLeague();
        });
        const handleLeagueUpdate = ({ leagueId: updatedLeagueId }: LeagueEventPayload) => {
            if (updatedLeagueId !== leagueId)
                return;
            queryClient.invalidateQueries({
                queryKey: queryKeys.leagues.detail(leagueId),
            });
        };
        const handleLeagueLobbiesUpdate = ({ leagueId: updatedLeagueId }: LeagueEventPayload) => {
            if (updatedLeagueId !== leagueId)
                return;
            queryClient.invalidateQueries({
                queryKey: queryKeys.leagues.lobbies(leagueId),
            });
        };
        const handleLeagueMembersUpdate = ({ leagueId: updatedLeagueId }: LeagueEventPayload) => {
            if (updatedLeagueId !== leagueId)
                return;
            queryClient.invalidateQueries({
                queryKey: queryKeys.leagues.members(leagueId),
            });
        };
        const handleLeagueRequestsUpdate = ({ leagueId: updatedLeagueId }: LeagueEventPayload) => {
            if (updatedLeagueId !== leagueId)
                return;
            queryClient.invalidateQueries({
                queryKey: queryKeys.leagues.requests(leagueId),
            });
        };
        const handleMatchUpdate = (payload: LeagueEventPayload) => {
            if (payload.leagueId !== leagueId)
                return;
            queryClient.invalidateQueries({ queryKey: queryKeys.leagues.matches(leagueId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.leagues.standings(leagueId) });
            if (payload.matchId)
                queryClient.invalidateQueries({ queryKey: queryKeys.matches.detail(payload.matchId) });
        };
        joinLeague();
        socket.on("connect", joinLeague);
        socket.on(SOCKET_EVENTS.LEAGUE_UPDATE, handleLeagueUpdate);
        socket.on(SOCKET_EVENTS.LEAGUE_LOBBIES_UPDATE, handleLeagueLobbiesUpdate);
        socket.on(SOCKET_EVENTS.LEAGUE_MEMBERS_UPDATE, handleLeagueMembersUpdate);
        socket.on(SOCKET_EVENTS.LEAGUE_REQUESTS_UPDATE, handleLeagueRequestsUpdate);
        socket.on(SOCKET_EVENTS.MATCH_STARTED, handleMatchUpdate);
        socket.on(SOCKET_EVENTS.MATCH_VOTE, handleMatchUpdate);
        socket.on(SOCKET_EVENTS.MATCH_FINISHED, handleMatchUpdate);
        return () => {
            socket.off("connect", joinLeague);
            socket.off(SOCKET_EVENTS.LEAGUE_UPDATE, handleLeagueUpdate);
            socket.off(SOCKET_EVENTS.LEAGUE_LOBBIES_UPDATE, handleLeagueLobbiesUpdate);
            socket.off(SOCKET_EVENTS.LEAGUE_MEMBERS_UPDATE, handleLeagueMembersUpdate);
            socket.off(SOCKET_EVENTS.LEAGUE_REQUESTS_UPDATE, handleLeagueRequestsUpdate);
            socket.off(SOCKET_EVENTS.MATCH_STARTED, handleMatchUpdate);
            socket.off(SOCKET_EVENTS.MATCH_VOTE, handleMatchUpdate);
            socket.off(SOCKET_EVENTS.MATCH_FINISHED, handleMatchUpdate);
            socket.emit(SOCKET_EVENTS.LEAGUE_LEAVE, leagueId);
        };
    }, [leagueId, queryClient]);
}
