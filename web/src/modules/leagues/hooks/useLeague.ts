import { useQuery } from "@tanstack/react-query";
import { getLeague } from "../services/leagues.service";

export function useLeague(leagueId: string) {
  return useQuery({
    queryKey: ["league", leagueId],
    queryFn: () => getLeague(leagueId)
  });
}