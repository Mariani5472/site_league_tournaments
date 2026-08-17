import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveRequest, rejectRequest } from "../services/leagues.service";
import type { LeagueRequest } from "../types/request";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import { mutationErrorMessage } from "@/services/api-errors";
type Props = {
    leagueId: string;
    requests: LeagueRequest[];
};
export function LeagueRequests({ leagueId, requests }: Props) {
    const queryClient = useQueryClient();
    const approveMutation = useMutation({
        mutationFn: (requestId: string) => approveRequest(leagueId, requestId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.leagues.requests(leagueId)
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.leagues.members(leagueId)
            });
            toast.success("Player approved");
        },
        onError: (error: unknown) => toast.error(mutationErrorMessage(error)),
    });
    const rejectMutation = useMutation({
        mutationFn: (requestId: string) => rejectRequest(leagueId, requestId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.leagues.requests(leagueId)
            });
            toast.success("Request rejected");
        },
        onError: (error: unknown) => toast.error(mutationErrorMessage(error)),
    });
    const pendingRequests = requests.filter(r => r.status == 'pending');
    return (<div className="
        rounded-xl
        border
        p-6
      ">
      <h2 className="
          mb-4
          text-xl
          font-semibold
        ">
        Join Requests
      </h2>

      <div className="space-y-3">
        {pendingRequests.length === 0 && <p className="text-muted-foreground">Nenhuma solicitação pendente.</p>}
        {pendingRequests.map((request) => (<div key={request.id} className="
              flex
              items-center
              justify-between
              rounded-lg
              border
              p-3
            ">
            <div>
              <p className="
                  font-medium
                ">
                {request.nickname}
              </p>
            </div>

            <div className="
                flex
                gap-2
              ">
              <button disabled={approveMutation.isPending || rejectMutation.isPending} onClick={() => approveMutation.mutate(request.id)} className="
                  rounded-md
                  bg-green-600
                  px-3
                  py-1
                  text-sm
                  text-white
                ">
                Approve
              </button>

              <button disabled={approveMutation.isPending || rejectMutation.isPending} onClick={() => rejectMutation.mutate(request.id)} className="
                  rounded-md
                  bg-red-600
                  px-3
                  py-1
                  text-sm
                  text-white
                ">
                Reject
              </button>
            </div>
          </div>))}
      </div>
    </div>);
}
