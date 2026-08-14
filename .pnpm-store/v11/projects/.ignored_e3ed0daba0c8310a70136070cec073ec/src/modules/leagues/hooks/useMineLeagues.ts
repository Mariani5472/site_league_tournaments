import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getMineLeagues } from "../services/leagues.service";
export function useMineLeagues() {
    return useQuery({
        queryKey: queryKeys.leagues.mine,
        queryFn: getMineLeagues
    });
}
