import { useQuery } from "@tanstack/react-query";
import { getLobby } from "../services/lobbies.service";

export function useLobby(
  leagueId: string,
  lobbyId: string
) {
  return useQuery({
    queryKey: ["lobby", leagueId, lobbyId],
    queryFn: () => getLobby(leagueId, lobbyId),
    enabled: !!leagueId && !!lobbyId,
  });
}