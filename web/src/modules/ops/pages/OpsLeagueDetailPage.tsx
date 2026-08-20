import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";
import { EmptyState } from "@/components/async/EmptyState";
import { InlineError } from "@/components/async/InlineError";
import { PageSkeleton } from "@/components/async/PageSkeleton";
import { formatDateTime, t } from "@/i18n";
import { useOpsLeague } from "../hooks";

export function OpsLeagueDetailPage() {
    const { leagueId = "" } = useParams();
    const query = useOpsLeague(leagueId);
    if (query.isLoading) return <PageSkeleton />;
    if (!query.data) {
        return <InlineError message={t("ops.leagueLoadError")} retry={query.refetch} />;
    }
    const league = query.data;
    return (
        <div className="space-y-6">
            <Link
                to="/ops?section=leagues"
                className="inline-flex items-center gap-2 text-sm text-primary"
            >
                <ArrowLeft className="h-4 w-4" /> {t("ops.back")}
            </Link>
            <header className="rounded-2xl border bg-card p-6 shadow-sm">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Trophy className="h-4 w-4" /> {t("ops.leagueDetail")}
                </p>
                <div className="mt-3 flex flex-wrap justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">{league.name}</h1>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">{league.id}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                        {t("ops.status", { status: league.operationalStatus })}
                    </span>
                </div>
                <p className="mt-4 text-sm">{t("ops.owner", { nickname: league.ownerNickname })}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                    {league.visibility} · {league.memberCount}/{league.maxPlayers} membros ·{" "}
                    {league.joinPolicy}
                </p>
            </header>

            <section
                className="grid gap-4 sm:grid-cols-3"
                aria-label={t("ops.status", { status: league.operationalStatus })}
            >
                <Info label={t("ops.members")} value={league.memberCount} />
                <Info label={t("ops.activeLobbies")} value={league.activeLobbyCount} />
                <Info label={t("ops.activeMatches")} value={league.activeMatchCount} />
            </section>

            <Collection title={t("ops.members")} empty={t("ops.noMembers")}>
                {league.members.map(member => (
                    <Link
                        key={member.userId}
                        to={`/ops/users/${member.userId}`}
                        className="flex justify-between gap-4 py-3 hover:text-primary"
                    >
                        <span>{member.nickname}</span>
                        <span className="text-sm text-muted-foreground">{member.role}</span>
                    </Link>
                ))}
            </Collection>
            <Collection title={t("ops.recentLobbies")} empty={t("ops.noRecentLobbies")}>
                {league.recentLobbies.map(lobby => (
                    <div key={lobby.id} className="flex justify-between gap-4 py-3">
                        <span className="font-mono text-xs">{lobby.id}</span>
                        <span className="text-sm text-muted-foreground">
                            {lobby.status} · {formatDateTime(lobby.createdAt)}
                        </span>
                    </div>
                ))}
            </Collection>
            <Collection title={t("ops.recentMatches")} empty={t("ops.noRecentMatches")}>
                {league.recentMatches.map(match => (
                    <div key={match.id} className="flex justify-between gap-4 py-3">
                        <span className="font-mono text-xs">{match.id}</span>
                        <span className="text-sm text-muted-foreground">{match.status}</span>
                    </div>
                ))}
            </Collection>
        </div>
    );
}

function Info({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
        </div>
    );
}

function Collection({
    title,
    empty,
    children,
}: {
    title: string;
    empty: string;
    children: React.ReactNode[];
}) {
    return (
        <section className="rounded-xl border bg-card p-5">
            <h2 className="text-lg font-semibold">{title}</h2>
            {children.length === 0 ? (
                <EmptyState title={empty} />
            ) : (
                <div className="mt-4 divide-y">{children}</div>
            )}
        </section>
    );
}
