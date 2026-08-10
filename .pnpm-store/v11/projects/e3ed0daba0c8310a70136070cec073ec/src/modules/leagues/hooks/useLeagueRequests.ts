import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getLeagueRequests } from "../services/leagues.service";

export function useLeagueRequests(leagueId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.leagues.requests(leagueId),
    queryFn: () => getLeagueRequests(leagueId),
    enabled,
  });
}
