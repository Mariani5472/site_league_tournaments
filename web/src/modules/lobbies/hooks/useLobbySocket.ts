import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { socket } from "@/services/socket";
import { SOCKET_EVENTS } from "@/services/socket-events";

export function useLobbySocket(
  leagueId: string,
  lobbyId: string
) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    socket.emit(SOCKET_EVENTS.LEAGUE_JOIN, leagueId);

    const handleLobbyUpdate = (payload: {
      lobby_id: string;
      league_id: string;
    }) => {
      if (payload.lobby_id !== lobbyId) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: ["league", leagueId],
      });

      queryClient.invalidateQueries({
        queryKey: ["lobby", leagueId, lobbyId],
      });
    };

    const handleLobbyDelete = (payload: {
      lobby_id: string;
      league_id: string;
    }) => {
      if (payload.lobby_id !== lobbyId) {
        return;
      }

      queryClient.removeQueries({
        queryKey: ["lobby", leagueId, lobbyId],
      });

      navigate(`/leagues/${leagueId}`, {
        replace: true,
      });
    };

    socket.on(SOCKET_EVENTS.LOBBY_UPDATE, handleLobbyUpdate);

    socket.on(SOCKET_EVENTS.LOBBY_DELETE, handleLobbyDelete);

    return () => {
      socket.emit(
        SOCKET_EVENTS.LEAGUE_LEAVE,
        leagueId
      );

      socket.off(
        SOCKET_EVENTS.LOBBY_UPDATE,
        handleLobbyUpdate
      );

      socket.off(
        SOCKET_EVENTS.LOBBY_DELETE,
        handleLobbyDelete
      );
    };
  }, [
    leagueId,
    lobbyId,
    navigate,
    queryClient,
  ]);
}