import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getRiotConfiguration } from "../services/riot.service";
export function useRiotConfiguration() {
    return useQuery({
        queryKey: queryKeys.riot.config,
        queryFn: getRiotConfiguration,
        staleTime: 5 * 60 * 1000,
    });
}
