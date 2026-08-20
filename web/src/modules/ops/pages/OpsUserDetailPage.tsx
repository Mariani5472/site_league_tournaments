import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Mail, Shield, UserRound } from "lucide-react";
import { EmptyState } from "@/components/async/EmptyState";
import { InlineError } from "@/components/async/InlineError";
import { PageSkeleton } from "@/components/async/PageSkeleton";
import { formatDate, formatDateTime, t } from "@/i18n";
import { useOpsUser } from "../hooks";

export function OpsUserDetailPage() {
    const { userId = "" } = useParams();
    const query = useOpsUser(userId);
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
                    <span className="rounded-full bg-success/10 px-3 py-1 text-sm text-success">
                        {t("ops.accountActive")}
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

            <section
                className="grid gap-4 md:grid-cols-3"
                aria-label={t("ops.status", { status: user.accountStatus })}
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
