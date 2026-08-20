import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Mail, Shield, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/async/EmptyState";
import { InlineError } from "@/components/async/InlineError";
import { PageSkeleton } from "@/components/async/PageSkeleton";
import { formatDate, formatDateTime, t } from "@/i18n";
import { mutationErrorMessage } from "@/services/api-errors";
import { useOpsUser, useOpsUserContainment } from "../hooks";

export function OpsUserDetailPage() {
    const { userId = "" } = useParams();
    const query = useOpsUser(userId);
    const containment = useOpsUserContainment(userId);
    const [reason, setReason] = useState("");
    const [suspendedUntil, setSuspendedUntil] = useState("");
    if (query.isLoading) return <PageSkeleton />;
    if (!query.data) {
        return <InlineError message={t("ops.userLoadError")} retry={query.refetch} />;
    }
    const user = query.data;
    return (
        <div className="space-y-6">
            <Link
                to="/ops?section=users"
                className="inline-flex items-center gap-2 text-sm text-primary"
            >
                <ArrowLeft className="h-4 w-4" /> {t("ops.back")}
            </Link>
            <header className="rounded-2xl border bg-card p-6 shadow-sm">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UserRound className="h-4 w-4" /> {t("ops.userDetail")}
                </p>
                <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">{user.nickname}</h1>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">{user.id}</p>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
                        {user.operationalStatus === "active"
                            ? t("ops.account.active")
                            : user.operationalStatus === "suspended"
                              ? t("ops.account.suspended")
                              : t("ops.account.banned")}
                    </span>
                </div>
                <p className="mt-4 flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4" /> {user.email}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t("ops.created", {
                        date: formatDate(user.createdAt),
                        count: user.membershipCount,
                    })}
                </p>
                {user.platformRoles.length > 0 && (
                    <p className="mt-3 flex items-center gap-2 text-sm font-medium text-primary">
                        <Shield className="h-4 w-4" /> {user.platformRoles.join(", ")}
                    </p>
                )}
            </header>

            <section className="rounded-xl border bg-card p-5">
                <h2 className="text-lg font-semibold">{t("ops.containmentTitle")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t("ops.containmentDescription")}
                </p>
                {user.restrictionReason && (
                    <p className="mt-3 text-sm">
                        {t("common.reason", { reason: user.restrictionReason })}
                    </p>
                )}
                {user.suspendedUntil && (
                    <p className="mt-1 text-sm">
                        {t("ops.suspendedUntil", { date: formatDateTime(user.suspendedUntil) })}
                    </p>
                )}
                {user.sessionRevocationStatus === "failed" && (
                    <div className="mt-3 space-y-3">
                        <InlineError message={t("ops.revocationFailed")} />
                        <Button
                            type="button"
                            variant="outline"
                            disabled={containment.suspend.isPending}
                            onClick={() => {
                                if (!user.restrictionReason || !user.suspendedUntil) return;
                                containment.suspend.mutate(
                                    {
                                        reason: user.restrictionReason,
                                        suspendedUntil: user.suspendedUntil,
                                    },
                                    {
                                        onSuccess: state =>
                                            state.sessionRevocationStatus === "failed"
                                                ? toast.warning(t("ops.suspendedRevocationPending"))
                                                : toast.success(t("ops.revocationRetried")),
                                        onError: error => toast.error(mutationErrorMessage(error)),
                                    }
                                );
                            }}
                        >
                            {t("ops.retryRevocation")}
                        </Button>
                    </div>
                )}
                <form
                    className="mt-4 grid gap-4 md:grid-cols-[1fr_240px_auto] md:items-end"
                    onSubmit={(event: FormEvent) => {
                        event.preventDefault();
                        if (user.operationalStatus === "suspended") {
                            containment.unsuspend.mutate(reason, {
                                onSuccess: () => {
                                    setReason("");
                                    toast.success(t("ops.unsuspended"));
                                },
                                onError: error => toast.error(mutationErrorMessage(error)),
                            });
                            return;
                        }
                        containment.suspend.mutate(
                            { reason, suspendedUntil: new Date(suspendedUntil).toISOString() },
                            {
                                onSuccess: state => {
                                    setReason("");
                                    if (state.sessionRevocationStatus === "failed") {
                                        toast.warning(t("ops.suspendedRevocationPending"));
                                    } else toast.success(t("ops.suspended"));
                                },
                                onError: error => toast.error(mutationErrorMessage(error)),
                            }
                        );
                    }}
                >
                    <div>
                        <label htmlFor="ops-containment-reason" className="text-sm font-medium">
                            {t("ops.containmentReason")}
                        </label>
                        <Input
                            id="ops-containment-reason"
                            value={reason}
                            minLength={10}
                            maxLength={500}
                            required
                            onChange={event => setReason(event.target.value)}
                        />
                    </div>
                    {user.operationalStatus !== "suspended" && (
                        <div>
                            <label htmlFor="ops-suspended-until" className="text-sm font-medium">
                                {t("ops.suspensionEnd")}
                            </label>
                            <Input
                                id="ops-suspended-until"
                                type="datetime-local"
                                value={suspendedUntil}
                                required
                                onChange={event => setSuspendedUntil(event.target.value)}
                            />
                        </div>
                    )}
                    <Button
                        type="submit"
                        variant={user.operationalStatus === "suspended" ? "outline" : "destructive"}
                        disabled={containment.suspend.isPending || containment.unsuspend.isPending}
                    >
                        {user.operationalStatus === "suspended"
                            ? t("ops.unsuspend")
                            : t("ops.suspend")}
                    </Button>
                </form>
            </section>

            <section
                className="grid gap-4 md:grid-cols-3"
                aria-label={t("ops.status", { status: user.operationalStatus })}
            >
                <Info label={t("ops.pendingRequests")} value={user.pendingRequestCount} />
                <Info label={t("ops.pendingInvitations")} value={user.pendingInvitationCount} />
                <Info
                    label={t("ops.activeLobby")}
                    value={user.activeLobby?.leagueName ?? t("ops.none")}
                />
            </section>

            <section className="rounded-xl border bg-card p-5">
                <h2 className="text-lg font-semibold">{t("ops.membershipsTitle")}</h2>
                {user.memberships.length === 0 ? (
                    <EmptyState title={t("ops.noMemberships")} />
                ) : (
                    <div className="mt-4 divide-y">
                        {user.memberships.map(membership => (
                            <Link
                                key={membership.leagueId}
                                to={`/ops/leagues/${membership.leagueId}`}
                                className="flex justify-between gap-4 py-3 hover:text-primary"
                            >
                                <span>{membership.leagueName}</span>
                                <span className="text-sm text-muted-foreground">
                                    {membership.role}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            <section className="rounded-xl border bg-card p-5">
                <h2 className="text-lg font-semibold">{t("ops.recentMatches")}</h2>
                {user.recentMatches.length === 0 ? (
                    <EmptyState title={t("ops.noRecentMatches")} />
                ) : (
                    <div className="mt-4 divide-y">
                        {user.recentMatches.map(match => (
                            <div key={match.id} className="flex justify-between gap-4 py-3">
                                <span>{match.leagueName}</span>
                                <span className="text-sm text-muted-foreground">
                                    {match.result ?? match.status}
                                    {match.finishedAt
                                        ? ` · ${formatDateTime(match.finishedAt)}`
                                        : ""}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

function Info({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
        </div>
    );
}
