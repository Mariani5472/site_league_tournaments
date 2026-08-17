import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getPublicProfile } from "../services/profile.service";
export function usePublicProfile(userId: string) {
    return useQuery({
        queryKey: queryKeys.profile.player(userId),
        queryFn: () => getPublicProfile(userId),
    });
}
