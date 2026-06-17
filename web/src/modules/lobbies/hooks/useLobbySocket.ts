import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "@/services/socket";
import { SOCKET_EVENTS } from "@/services/socket-events";

export function useLobbySocket(lobbyId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleLobbyUpdate = (payload: { lobbyId: string; }) => {
      if (payload.lobbyId !== lobbyId) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: ["lobby", lobbyId]
      });
    };

    socket.on(SOCKET_EVENTS.LOBBY_UPDATE, handleLobbyUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.LOBBY_UPDATE, handleLobbyUpdate);
    };
  }, [lobbyId, queryClient]);
}