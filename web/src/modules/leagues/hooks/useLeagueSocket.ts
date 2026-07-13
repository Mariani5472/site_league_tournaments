import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "@/services/socket";
import { SOCKET_EVENTS } from "@/services/socket-events";

export function useLeagueSocket(leagueId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    socket.emit(SOCKET_EVENTS.LEAGUE_JOIN, leagueId);

    const handleLobbyUpdate = (payload: {
      league_id: string;
    }) => {
      if (payload.league_id !== leagueId) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: ["league", leagueId]
      });
    };

    socket.on(SOCKET_EVENTS.LOBBY_UPDATE, handleLobbyUpdate);

    return () => {
      socket.emit(SOCKET_EVENTS.LEAGUE_LEAVE, leagueId);
      socket.off(SOCKET_EVENTS.LEAGUE_UPDATE, handleLobbyUpdate);
    };
  }, [leagueId, queryClient]);
}