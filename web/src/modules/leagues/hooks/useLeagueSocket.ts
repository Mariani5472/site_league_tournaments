import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "@/services/socket";
import { SOCKET_EVENTS } from "@/services/socket-events";

type LeagueEventPayload = {
  league_id: string;
};

export function useLeagueSocket(leagueId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const joinLeague = () => socket.emit(SOCKET_EVENTS.LEAGUE_JOIN, leagueId);

    const handleLeagueUpdate = ({ league_id }: LeagueEventPayload) => {
      if (league_id !== leagueId) return;

      queryClient.invalidateQueries({
        queryKey: ["league", leagueId],
      });
    };

    const handleLeagueLobbiesUpdate = ({ league_id }: LeagueEventPayload) => {
      if (league_id !== leagueId) return;

      queryClient.invalidateQueries({
        queryKey: ["league-lobbies", leagueId],
      });
    };

    const handleLeagueMembersUpdate = ({ league_id }: LeagueEventPayload) => {
      if (league_id !== leagueId) return;

      queryClient.invalidateQueries({
        queryKey: ["league-members", leagueId],
      });
    };

    const handleLeagueRequestsUpdate = ({ league_id }: LeagueEventPayload) => {
      if (league_id !== leagueId) return;

      queryClient.invalidateQueries({
        queryKey: ["league-requests", leagueId],
      });
    };

    joinLeague();
    socket.on("connect", joinLeague);

    socket.on(SOCKET_EVENTS.LEAGUE_UPDATE, handleLeagueUpdate);
    socket.on(SOCKET_EVENTS.LEAGUE_LOBBIES_UPDATE, handleLeagueLobbiesUpdate);
    socket.on(SOCKET_EVENTS.LEAGUE_MEMBERS_UPDATE, handleLeagueMembersUpdate);
    socket.on(SOCKET_EVENTS.LEAGUE_REQUESTS_UPDATE, handleLeagueRequestsUpdate);

    return () => {
      socket.off("connect", joinLeague);
      socket.off(SOCKET_EVENTS.LEAGUE_UPDATE, handleLeagueUpdate);
      socket.off(SOCKET_EVENTS.LEAGUE_LOBBIES_UPDATE, handleLeagueLobbiesUpdate);
      socket.off(SOCKET_EVENTS.LEAGUE_MEMBERS_UPDATE, handleLeagueMembersUpdate);
      socket.off(SOCKET_EVENTS.LEAGUE_REQUESTS_UPDATE, handleLeagueRequestsUpdate);
      socket.emit(SOCKET_EVENTS.LEAGUE_LEAVE, leagueId);
    };
  }, [leagueId, queryClient]);
}