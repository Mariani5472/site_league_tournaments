import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getMyRiotAccount } from "../services/riot.service";
export function useMyRiotAccount() {
    return useQuery({
        queryKey: queryKeys.riot.me,
        queryFn: getMyRiotAccount
    });
}
