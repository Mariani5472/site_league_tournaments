import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getLeagueLobbies } from "../services/leagues.service";

export function useLeagueLobbies(leagueId: string) {
  return useQuery({
    queryKey: queryKeys.leagues.lobbies(leagueId),
    queryFn: () => getLeagueLobbies(leagueId),
    enabled: !!leagueId
  });
}
