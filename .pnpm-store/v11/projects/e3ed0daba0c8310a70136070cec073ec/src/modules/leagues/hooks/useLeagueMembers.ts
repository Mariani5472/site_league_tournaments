import { useQuery } from "@tanstack/react-query";

import { getLeagueMembers } from "../services/leagues.service";

export function useLeagueMembers(leagueId: string) {
  return useQuery({
    queryKey: ["league-members", leagueId],
    queryFn: () => getLeagueMembers(leagueId)
  });
}