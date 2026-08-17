import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateLeague } from "../services/leagues.service";
import { queryKeys } from "@/lib/queryKeys";
export function useUpdateLeague() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            leagueId,
            data,
        }: {
            leagueId: string;
            data: Parameters<typeof updateLeague>[1];
        }) => updateLeague(leagueId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.leagues.detail(variables.leagueId),
            });
        },
    });
}
