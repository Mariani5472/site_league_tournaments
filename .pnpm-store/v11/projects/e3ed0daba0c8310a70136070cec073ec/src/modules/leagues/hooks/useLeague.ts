import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getLeague } from "../services/leagues.service";
export function useLeague(leagueId: string) {
    return useQuery({
        queryKey: queryKeys.leagues.detail(leagueId),
        queryFn: () => getLeague(leagueId)
    });
}
