import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveRequest, rejectRequest } from "../services/leagues.service";
import type { LeagueRequest } from "../types/request";
import { toast } from "sonner";

type Props = {
  leagueId: string;
  requests: LeagueRequest[];
};

export function LeagueRequests({
  leagueId,
  requests
}: Props) {
  const queryClient = useQueryClient();

  const approveMutation =
    useMutation({
      mutationFn: (requestId: string) => approveRequest(leagueId, requestId),

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [
            "league-requests",
            leagueId
          ]
        });

        queryClient.invalidateQueries({
          queryKey: [
            "league-members",
            leagueId
          ]
        });

        toast.success("Player approved");
      }
    });

  const rejectMutation =
    useMutation({
      mutationFn: (requestId: string) => rejectRequest(leagueId,requestId),

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [
            "league-requests",
            leagueId
          ]
        });
        
        toast.success("Request rejected")
      }

    });

  const pendingRequests = requests.filter(r => r.status == 'pending');

  return (
    <div
      className="
        rounded-xl
        border
        p-6
      "
    >
      <h2
        className="
          mb-4
          text-xl
          font-semibold
        "
      >
        Join Requests
      </h2>

      <div className="space-y-3">
        {pendingRequests.map((request) => (
          <div
            key={request.id}
            className="
              flex
              items-center
              justify-between
              rounded-lg
              border
              p-3
            "
          >
            <div>
              <p
                className="
                  font-medium
                "
              >
                {request.nickname}
              </p>
            </div>

            <div
              className="
                flex
                gap-2
              "
            >
              <button
                onClick={() => approveMutation.mutate(request.id)}
                className="
                  rounded-md
                  bg-green-600
                  px-3
                  py-1
                  text-sm
                  text-white
                "
              >
                Approve
              </button>

              <button
                onClick={() => rejectMutation.mutate(request.id)}
                className="
                  rounded-md
                  bg-red-600
                  px-3
                  py-1
                  text-sm
                  text-white
                "
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}