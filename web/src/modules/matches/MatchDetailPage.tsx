import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Trophy, Vote } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatNumber, t } from "@/i18n";
import { labelResolution } from "@/i18n/labels";
import { MatchStatusBadge } from "@/components/SemanticBadge";
import { queryKeys } from "@/lib/queryKeys";
import { getMatch } from "./services";

export function MatchDetailPage() {
    const { matchId = "" } = useParams();
    const match = useQuery({
        queryKey: queryKeys.matches.detail(matchId),
        queryFn: () => getMatch(matchId),
        enabled: Boolean(matchId),
    });
    if (match.isLoading) return <p role="status">{t("async.match")}</p>;
    if (match.isError || !match.data)
        return (
            <p role="alert" className="text-destructive">
                {t("match.loadingError")}
            </p>
        );
    const data = match.data;
    return (
        <div className="space-y-6">
            <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
                <p className="text-sm text-muted-foreground">{t("match.detailDescription")}</p>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">{t("match.detailTitle")}</h1>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <CalendarDays className="h-4 w-4" />
                                {t("match.startedAt", { date: formatDateTime(data.startedAt) })}
                            </span>
                            {data.finishedAt && (
                                <span>
                                    {t("match.finishedAt", {
                                        date: formatDateTime(data.finishedAt),
                                    })}
                                </span>
                            )}
                        </div>
                    </div>
                    <MatchStatusBadge status={data.status} />
                </div>
            </header>
            <section className="grid gap-4 md:grid-cols-2">
                {[1, 2].map(team => {
                    const winner = data.winnerTeamNumber === team;
                    return (
                        <article
                            key={team}
                            className={`rounded-xl border bg-card p-5 ${winner ? "border-primary" : ""}`}
                        >
                            <h2 className="flex items-center gap-2 text-xl font-semibold">
                                {winner && <Trophy className="h-5 w-5 text-primary" />}
                                {t("match.team", { team })}
                            </h2>
                            <ul className="mt-4 space-y-2">
                                {data.players
                                    .filter(player => player.teamNumber === team)
                                    .map(player => (
                                        <li key={player.userId}>
                                            <Link
                                                className="hover:text-primary"
                                                to={`/players/${player.userId}`}
                                            >
                                                {player.nickname}
                                            </Link>
                                        </li>
                                    ))}
                            </ul>
                        </article>
                    );
                })}
            </section>
            <section className="grid gap-4 sm:grid-cols-2">
                <article className="rounded-xl border bg-card p-5">
                    <h2 className="font-semibold">{t("match.decisionMethod")}</h2>
                    <p className="mt-2 text-lg">
                        {data.resolutionType ? labelResolution(data.resolutionType) : "—"}
                    </p>
                    {data.resolutionReason && (
                        <p className="mt-2 text-sm text-muted-foreground">
                            {t("common.reason", { reason: data.resolutionReason })}
                        </p>
                    )}
                </article>
                <article className="rounded-xl border bg-card p-5">
                    <h2 className="flex items-center gap-2 font-semibold">
                        <Vote className="h-4 w-4" />
                        {t("match.voteSummary")}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                        <span>
                            {t("match.teamVotes", {
                                team: 1,
                                count: formatNumber(data.votes?.team1 ?? 0),
                            })}
                        </span>
                        <span>
                            {t("match.teamVotes", {
                                team: 2,
                                count: formatNumber(data.votes?.team2 ?? 0),
                            })}
                        </span>
                        <strong>
                            {t("match.totalVotes", { count: formatNumber(data.votes?.total ?? 0) })}
                        </strong>
                    </div>
                </article>
            </section>
            <nav className="flex flex-wrap gap-2" aria-label={t("match.nextSteps")}>
                <Button asChild variant="outline">
                    <Link to={`/leagues/${data.leagueId}#standings`}>
                        {t("match.viewStandings")}
                    </Link>
                </Button>
                <Button asChild>
                    <Link to={`/leagues/${data.leagueId}`}>
                        <ArrowLeft className="h-4 w-4" />
                        {t("match.backToLeague")}
                    </Link>
                </Button>
            </nav>
        </div>
    );
}
