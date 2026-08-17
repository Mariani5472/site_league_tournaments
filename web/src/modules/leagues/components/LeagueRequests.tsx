import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveRequest, rejectRequest } from "../services/leagues.service";
import type { LeagueRequest } from "../types/request";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import { mutationErrorMessage } from "@/services/api-errors";
import { t } from "@/i18n";
import { Button } from "@/components/ui/button";
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
                queryKey: queryKeys.leagues.requests(leagueId),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.leagues.members(leagueId),
            });
            toast.success(t("league.approved"));
        },
        onError: (error: unknown) => toast.error(mutationErrorMessage(error)),
    });
    const rejectMutation = useMutation({
        mutationFn: (requestId: string) => rejectRequest(leagueId, requestId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.leagues.requests(leagueId),
            });
            toast.success(t("league.rejected"));
        },
        onError: (error: unknown) => toast.error(mutationErrorMessage(error)),
    });
    const pendingRequests = requests.filter(r => r.status == "pending");
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
                {t("league.requests")}
            </h2>

            <div className="space-y-3">
                {pendingRequests.length === 0 && (
                    <p className="text-muted-foreground">{t("league.requestsEmpty")}</p>
                )}
                {pendingRequests.map(request => (
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
                            <Button
                                size="sm"
                                disabled={approveMutation.isPending || rejectMutation.isPending}
                                onClick={() => approveMutation.mutate(request.id)}
                                className="bg-success text-success-foreground hover:bg-success/90"
                            >
                                {t("league.approve")}
                            </Button>

                            <Button
                                size="sm"
                                variant="destructive"
                                disabled={approveMutation.isPending || rejectMutation.isPending}
                                onClick={() => rejectMutation.mutate(request.id)}
                            >
                                {t("league.reject")}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
