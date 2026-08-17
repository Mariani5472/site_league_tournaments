import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { linkRiotAccount } from "../services/riot.service";
export function useLinkRiotAccount(gameName: string, tagLine: string) {
    return useQuery({
        queryKey: queryKeys.riot.account(gameName, tagLine),
        queryFn: () => linkRiotAccount({ gameName, tagLine }),
        enabled: !!gameName && !!tagLine,
    });
}
