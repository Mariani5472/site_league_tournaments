import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "@/services/socket";
import { SOCKET_EVENTS } from "@/services/socket-events";
import { queryKeys } from "@/lib/queryKeys";
export function useLobbySocket(leagueId: string, lobbyId: string) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    useEffect(() => {
        const joinLobby = () => socket.emit(SOCKET_EVENTS.LOBBY_JOIN, lobbyId);
        const handleLobbyUpdate = (payload: {
            lobbyId: string;
            leagueId: string;
        }) => {
            if (payload.lobbyId !== lobbyId)
                return;
            queryClient.invalidateQueries({
                queryKey: queryKeys.leagues.detail(leagueId),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.lobbies.detail(leagueId, lobbyId),
            });
        };
        const handleLobbyDelete = (payload: {
            lobbyId: string;
            leagueId: string;
        }) => {
            if (payload.lobbyId !== lobbyId)
                return;
            queryClient.removeQueries({
                queryKey: queryKeys.lobbies.detail(leagueId, lobbyId),
            });
            navigate(`/leagues/${leagueId}`, {
                replace: true,
            });
        };
        joinLobby();
        socket.on("connect", joinLobby);
        socket.on(SOCKET_EVENTS.LOBBY_UPDATE, handleLobbyUpdate);
        socket.on(SOCKET_EVENTS.LOBBY_DELETE, handleLobbyDelete);
        return () => {
            socket.off("connect", joinLobby);
            socket.off(SOCKET_EVENTS.LOBBY_UPDATE, handleLobbyUpdate);
            socket.off(SOCKET_EVENTS.LOBBY_DELETE, handleLobbyDelete);
            socket.emit(SOCKET_EVENTS.LOBBY_LEAVE, lobbyId);
        };
    }, [leagueId, lobbyId, navigate, queryClient,]);
}
