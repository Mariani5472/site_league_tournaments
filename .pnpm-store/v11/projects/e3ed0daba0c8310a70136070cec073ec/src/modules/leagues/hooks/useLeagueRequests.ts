import { useQuery } from "@tanstack/react-query";
import { getLeagueRequests } from "../services/leagues.service";

export function useLeagueRequests(leagueId: string, enabled = true) {
  return useQuery({
    queryKey: ["league-requests", leagueId],
    queryFn: () => getLeagueRequests(leagueId),
    enabled,
  });
}