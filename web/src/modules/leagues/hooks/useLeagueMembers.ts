import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getLeagueMembers } from "../services/leagues.service";
export function useLeagueMembers(leagueId: string) {
    return useQuery({
        queryKey: queryKeys.leagues.members(leagueId),
        queryFn: () => getLeagueMembers(leagueId)
    });
}
