import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/async/EmptyState";
import { InlineError } from "@/components/async/InlineError";
import { PageSkeleton } from "@/components/async/PageSkeleton";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { queryKeys } from "@/lib/queryKeys";
import { mutationErrorMessage } from "@/services/api-errors";
import { useLeagueInvitations } from "../hooks/useLeagueInvitations";
import { respondToInvitation } from "../services/leagues.service";

export function InvitationsPage() {
    const queryClient = useQueryClient();
    const invitations = useLeagueInvitations();
    const response = useMutation({
        mutationFn: ({ id, status }: { id: string; status: "accepted" | "rejected" }) =>
            respondToInvitation(id, status),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.leagues.invitations });
            queryClient.invalidateQueries({ queryKey: queryKeys.leagues.mine });
            toast.success(
                variables.status === "accepted"
                    ? t("invitation.accepted")
                    : t("invitation.rejected")
            );
        },
        onError: error => toast.error(mutationErrorMessage(error)),
    });
    if (invitations.isLoading) return <PageSkeleton label={t("invitation.loading")} />;
    if (invitations.isError)
        return <InlineError message={t("invitation.error")} retry={invitations.refetch} />;
    return (
        <div className="space-y-6">
            <header className="rounded-2xl border bg-card p-6 sm:p-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MailCheck className="h-4 w-4" aria-hidden="true" />
                    {t("invitation.eyebrow")}
                </div>
                <h1 className="mt-2 text-3xl font-bold">{t("invitation.title")}</h1>
                <p className="mt-2 text-muted-foreground">{t("invitation.description")}</p>
            </header>
            {invitations.data.length === 0 ? (
                <EmptyState
                    title={t("invitation.empty")}
                    description={t("invitation.emptyDescription")}
                />
            ) : (
                <section className="space-y-3">
                    {invitations.data.map(invitation => (
                        <article key={invitation.id} className="rounded-xl border bg-card p-5">
                            <h2 className="font-semibold">{invitation.leagueName}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {t("invitation.from", { nickname: invitation.inviterNickname })}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Button
                                    disabled={response.isPending}
                                    onClick={() =>
                                        response.mutate({ id: invitation.id, status: "accepted" })
                                    }
                                >
                                    {t("invitation.accept")}
                                </Button>
                                <Button
                                    variant="outline"
                                    disabled={response.isPending}
                                    onClick={() =>
                                        response.mutate({ id: invitation.id, status: "rejected" })
                                    }
                                >
                                    {t("invitation.reject")}
                                </Button>
                            </div>
                        </article>
                    ))}
                    <LoadMoreButton
                        hasNextPage={invitations.hasNextPage}
                        isFetchingNextPage={invitations.isFetchingNextPage}
                        isFetchNextPageError={invitations.isFetchNextPageError}
                        onLoadMore={() => void invitations.fetchNextPage()}
                    />
                </section>
            )}
        </div>
    );
}
