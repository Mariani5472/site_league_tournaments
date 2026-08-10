import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getDiscoverLeagues } from "../services/leagues.service";
export function useDiscoverLeagues(search?: string) {
    return useQuery({
        queryKey: queryKeys.leagues.discover(search),
        queryFn: () => getDiscoverLeagues(search)
    });
}
