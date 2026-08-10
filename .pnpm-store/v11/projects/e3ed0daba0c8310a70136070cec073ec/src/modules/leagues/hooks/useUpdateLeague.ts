import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateLeague } from "../services/leagues.service";


export function useUpdateLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leagueId,
      data
    }: {
      leagueId: string;
      data: any;
    }) =>
      updateLeague(leagueId, data),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "league",
          variables.leagueId
        ]
      });
    }
  });
}