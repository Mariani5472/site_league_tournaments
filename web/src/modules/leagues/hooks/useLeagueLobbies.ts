import { useQuery } from "@tanstack/react-query";
import { getLeagueLobbies } from "../services/leagues.service";

export function useLeagueLobbies(leagueId: string) {
  return useQuery({
    queryKey: ["league-lobbies", leagueId],
    queryFn: () => getLeagueLobbies(leagueId),
    enabled: !!leagueId
  });
}