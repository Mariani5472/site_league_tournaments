import { useQuery } from "@tanstack/react-query";
import { getLeagueRequests } from "../services/leagues.service";

export function useLeagueRequests(leagueId: string) {
  return useQuery({
    queryKey: ["league-requests", leagueId],
    queryFn: () => getLeagueRequests(leagueId)
  });
}