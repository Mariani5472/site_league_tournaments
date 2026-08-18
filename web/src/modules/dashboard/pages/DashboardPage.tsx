import {
    ArrowRight,
    CheckCircle2,
    Clock3,
    History,
    Inbox,
    Sparkles,
    Swords,
    Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreateLeagueDialog } from "@/modules/leagues/components/CreateLeagueDialog";
import { formatDateTime, formatNumber, t } from "@/i18n";
import { useDashboard } from "../useDashboard";
import type { DashboardData } from "../types";
import { FirstLoginOnboarding } from "../components/FirstLoginOnboarding";
import { PageSkeleton } from "@/components/async/PageSkeleton";
import { InlineError } from "@/components/async/InlineError";
import { BackgroundRefresh } from "@/components/async/BackgroundRefresh";

const actionIcon = { lobby_waiting: Clock3, vote_pending: Swords, admin_requests: Inbox } as const;
function actionText(action: DashboardData["actions"][number]) {
    if (action.type === "lobby_waiting")
        return t("dashboard.action.lobby", { league: action.leagueName });
    if (action.type === "vote_pending")
        return t("dashboard.action.vote", { league: action.leagueName });
    return t("dashboard.action.requests", {
        league: action.leagueName,
        count: formatNumber(action.count ?? 0),
    });
}

export function DashboardPage() {
    const dashboard = useDashboard();
    if (dashboard.isLoading) return <PageSkeleton rows={4} />;
    if (dashboard.isError || !dashboard.data)
        return <InlineError message={t("dashboard.loadError")} retry={dashboard.refetch} />;
    const { summary, actions, recentLeagues, recentMatches } = dashboard.data;
    const empty = summary.leagueCount === 0;
    return (
        <div className="space-y-8">
            <BackgroundRefresh active={dashboard.isFetching && !dashboard.isLoading} />
            <FirstLoginOnboarding />
            <section className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-lg shadow-primary/15 sm:p-9">
                <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full bg-white/10" />
                <div className="relative flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-2xl">
                        <p className="flex items-center gap-2 text-sm font-medium text-white/80">
                            <Sparkles className="h-4 w-4" /> {t("dashboard.hub")}
                        </p>
                        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                            {t("dashboard.title")}
                        </h1>
                        <p className="mt-3 text-white/80">{t("dashboard.description")}</p>
                    </div>
                    <Button variant="secondary" asChild>
                        <Link to="/leagues">
                            {t("dashboard.explore")} <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </section>

            {empty ? (
                <section className="rounded-2xl border border-dashed bg-card p-8 text-center sm:p-12">
                    <Trophy className="mx-auto h-10 w-10 text-primary" />
                    <h2 className="mt-4 text-2xl font-bold">{t("dashboard.empty")}</h2>
                    <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
                        {t("dashboard.emptyHint")}
                    </p>
                    <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                        <CreateLeagueDialog />
                        <Button variant="outline" asChild>
                            <Link to="/leagues">{t("dashboard.explore")}</Link>
                        </Button>
                    </div>
                </section>
            ) : (
                <>
                    <section className="space-y-4">
                        <div>
                            <h2 className="text-2xl font-bold">{t("dashboard.nextActions")}</h2>
                            <p className="text-sm text-muted-foreground">
                                {t("dashboard.nextActionsDescription")}
                            </p>
                        </div>
                        {actions.length ? (
                            <div className="grid gap-3 md:grid-cols-2">
                                {actions.map(action => {
                                    const Icon = actionIcon[action.type];
                                    return (
                                        <Link
                                            key={`${action.type}-${action.id}`}
                                            to={action.href}
                                            className="group flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm hover:border-primary/40"
                                        >
                                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                                                <Icon className="h-5 w-5" />
                                            </span>
                                            <span className="flex-1 font-medium">
                                                {actionText(action)}
                                            </span>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 rounded-2xl border bg-card p-5 text-muted-foreground">
                                <CheckCircle2 className="h-5 w-5 text-success" />
                                <span>{t("dashboard.noActions")}</span>
                            </div>
                        )}
                    </section>

                    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {(
                            [
                                [
                                    "leagueCount",
                                    summary.leagueCount,
                                    t("dashboard.summary.leagues"),
                                ],
                                ["matches", summary.matchesPlayed, t("dashboard.summary.matches")],
                                ["wins", summary.wins, t("dashboard.summary.wins")],
                                ["losses", summary.losses, t("dashboard.summary.losses")],
                            ] as const
                        ).map(([key, value, label]) => (
                            <article key={key} className="rounded-2xl border bg-card p-5">
                                <p className="text-sm text-muted-foreground">{label}</p>
                                <p className="mt-2 text-3xl font-bold">{formatNumber(value)}</p>
                            </article>
                        ))}
                    </section>

                    <section className="grid gap-6 xl:grid-cols-2">
                        <div className="space-y-4">
                            <div className="flex items-end justify-between">
                                <div>
                                    <h2 className="text-xl font-bold">
                                        {t("dashboard.recentLeagues")}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {t("dashboard.recentLeaguesDescription")}
                                    </p>
                                </div>
                                <Link className="text-sm text-primary" to="/leagues">
                                    {t("dashboard.seeAll")}
                                </Link>
                            </div>
                            <div className="space-y-3">
                                {recentLeagues.map(league => (
                                    <Link
                                        key={league.id}
                                        to={`/leagues/${league.id}`}
                                        className="block rounded-xl border bg-card p-4 hover:border-primary/40"
                                    >
                                        <div className="flex justify-between gap-4">
                                            <span className="font-semibold">{league.name}</span>
                                            <span className="text-sm text-muted-foreground">
                                                {formatNumber(league.playerCount)}/
                                                {formatNumber(league.maxPlayers)}
                                            </span>
                                        </div>
                                        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                                            {league.description || t("dashboard.noDescription")}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-xl font-bold">
                                    {t("dashboard.recentMatches")}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {t("dashboard.recentMatchesDescription")}
                                </p>
                            </div>
                            {recentMatches.length ? (
                                <div className="space-y-3">
                                    {recentMatches.map(match => (
                                        <Link
                                            key={match.id}
                                            to={`/matches/${match.id}`}
                                            className="flex items-center gap-4 rounded-xl border bg-card p-4 hover:border-primary/40"
                                        >
                                            <History className="h-5 w-5 text-primary" />
                                            <span className="flex-1">
                                                <span className="block font-medium">
                                                    {match.leagueName}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDateTime(
                                                        match.finishedAt ?? match.startedAt
                                                    )}
                                                </span>
                                            </span>
                                            <span
                                                className={
                                                    match.result === "win"
                                                        ? "text-sm font-medium text-success"
                                                        : match.result === "loss"
                                                          ? "text-sm font-medium text-destructive"
                                                          : "text-sm text-muted-foreground"
                                                }
                                            >
                                                {match.result === "win"
                                                    ? t("dashboard.result.win")
                                                    : match.result === "loss"
                                                      ? t("dashboard.result.loss")
                                                      : t("dashboard.result.pending")}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
                                    {t("dashboard.noMatches")}
                                </p>
                            )}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
