import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { formatDateTime, formatList, formatNumber, formatPercent, t, tp } from "@/i18n";
import { labelMatchStatus, labelResolution } from "@/i18n/labels";
import { getMatches, getStandings } from "./services";
import { uniqueItems } from "@/types/pagination";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { Link } from "react-router-dom";
import { CompetitiveForm } from "./CompetitiveForm";

export function LeagueResults({
    leagueId,
    section = "all",
}: {
    leagueId: string;
    section?: "all" | "standings" | "matches";
}) {
    const matches = useInfiniteQuery({
        queryKey: queryKeys.leagues.matches(leagueId),
        queryFn: ({ pageParam }) => getMatches(leagueId, pageParam),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: page => page.nextCursor ?? undefined,
    });
    const matchItems = uniqueItems(matches.data?.pages);
    const standings = useQuery({
        queryKey: queryKeys.leagues.standings(leagueId),
        queryFn: () => getStandings(leagueId),
    });
    return (
        <>
            {section !== "matches" && (
                <section
                    id="standings"
                    className="rounded-xl border p-4 sm:p-6 space-y-4 overflow-hidden scroll-mt-6"
                >
                    <h2 className="text-xl font-semibold">{t("match.standings")}</h2>
                    {standings.isLoading ? (
                        <p className="text-muted-foreground">{t("async.standings")}</p>
                    ) : standings.isError ? (
                        <p className="text-destructive">{t("match.standingsError")}</p>
                    ) : standings.data?.length ? (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-sm">
                                <thead>
                                    <tr className="text-left border-b">
                                        <th className="p-2">{t("match.position")}</th>
                                        <th>{t("match.player")}</th>
                                        <th>{t("match.played")}</th>
                                        <th>{t("match.wins")}</th>
                                        <th>{t("match.losses")}</th>
                                        <th>{t("match.winRate")}</th>
                                        <th>{t("match.recentForm")}</th>
                                        <th>{t("match.streak")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {standings.data.map(row => (
                                        <tr key={row.userId} className="border-b last:border-0">
                                            <td className="p-2">{formatNumber(row.position)}</td>
                                            <td>{row.nickname}</td>
                                            <td>{formatNumber(row.gamesPlayed)}</td>
                                            <td>{formatNumber(row.wins)}</td>
                                            <td>{formatNumber(row.losses)}</td>
                                            <td>{formatPercent(row.winRate)}</td>
                                            <td className="py-2 pr-3">
                                                <CompetitiveForm
                                                    recentForm={row.recentForm}
                                                    currentStreak={row.currentStreak}
                                                    currentStreakResult={row.currentStreakResult}
                                                    compact
                                                />
                                            </td>
                                            <td className="pr-2 text-xs text-muted-foreground">
                                                {row.currentStreakResult
                                                    ? row.currentStreakResult === "win"
                                                        ? tp(row.currentStreak, {
                                                              one: "match.winStreak.one",
                                                              other: "match.winStreak.other",
                                                          })
                                                        : tp(row.currentStreak, {
                                                              one: "match.lossStreak.one",
                                                              other: "match.lossStreak.other",
                                                          })
                                                    : t("match.formEmpty")}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-muted-foreground">{t("match.noRanked")}</p>
                    )}
                </section>
            )}
            {section !== "standings" && (
                <section className="rounded-xl border p-4 sm:p-6 space-y-4">
                    <h2 className="text-xl font-semibold">{t("match.history")}</h2>
                    {matches.isLoading ? (
                        <p className="text-muted-foreground">{t("async.matches")}</p>
                    ) : matches.isError ? (
                        <p className="text-destructive">{t("match.historyError")}</p>
                    ) : matchItems.length ? (
                        <div className="space-y-3">
                            {matchItems.map(match => {
                                const votes = t("common.votes", {
                                    count: formatNumber(match.voteCount ?? 0),
                                });
                                return (
                                    <Link
                                        key={match.id}
                                        to={`/matches/${match.id}`}
                                        className="block rounded-lg border p-4 space-y-2 transition-colors hover:border-primary/40"
                                    >
                                        <div className="flex flex-wrap justify-between gap-2">
                                            <span className="font-medium">
                                                {formatDateTime(match.startedAt)}
                                            </span>
                                            <span className="text-sm">
                                                {labelMatchStatus(match.status)}
                                            </span>
                                        </div>
                                        <div className="grid sm:grid-cols-2 gap-2 text-sm">
                                            {[1, 2].map(team => (
                                                <div key={team}>
                                                    {t("match.teamPlayers", {
                                                        team,
                                                        players: formatList(
                                                            match.players
                                                                .filter(
                                                                    player =>
                                                                        player.teamNumber === team
                                                                )
                                                                .map(player => player.nickname)
                                                        ),
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {match.winnerTeamNumber
                                                ? t("match.winner", {
                                                      team: match.winnerTeamNumber,
                                                      resolution: labelResolution(
                                                          match.resolutionType ?? "vote"
                                                      ),
                                                      votes,
                                                  })
                                                : t("match.votingOpen", { votes })}
                                        </p>
                                        {match.resolutionReason && (
                                            <p className="text-sm">
                                                {t("common.reason", {
                                                    reason: match.resolutionReason,
                                                })}
                                            </p>
                                        )}
                                    </Link>
                                );
                            })}
                            <LoadMoreButton
                                hasNextPage={matches.hasNextPage}
                                isFetchingNextPage={matches.isFetchingNextPage}
                                isFetchNextPageError={matches.isFetchNextPageError}
                                onLoadMore={() => void matches.fetchNextPage()}
                            />
                        </div>
                    ) : (
                        <p className="text-muted-foreground">{t("match.noMatches")}</p>
                    )}
                </section>
            )}
        </>
    );
}
