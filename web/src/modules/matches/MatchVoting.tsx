import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMatch, resolveMatch, voteMatch } from "./services";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import { useSocketConnected } from "@/hooks/useSocketConnected";
import { formatNumber, t } from "@/i18n";
import { labelResolution } from "@/i18n/labels";
import { mutationErrorMessage } from "@/services/api-errors";
import { Link } from "react-router-dom";
export function MatchVoting({ matchId, canResolve }: { matchId: string; canResolve: boolean }) {
    const client = useQueryClient();
    const socketConnected = useSocketConnected();
    const [reason, setReason] = useState("");
    const match = useQuery({
        queryKey: queryKeys.matches.detail(matchId),
        queryFn: () => getMatch(matchId),
        refetchInterval: socketConnected ? false : 15_000,
        refetchOnWindowFocus: true,
    });
    const refresh = (updatedMatch: typeof match.data) => {
        client.invalidateQueries({ queryKey: queryKeys.matches.detail(matchId) });
        if (updatedMatch?.leagueId) {
            client.invalidateQueries({
                queryKey: queryKeys.leagues.matches(updatedMatch.leagueId),
            });
            client.invalidateQueries({
                queryKey: queryKeys.leagues.standings(updatedMatch.leagueId),
            });
        }
    };
    const vote = useMutation({
        mutationFn: (team: number) => voteMatch(matchId, team),
        onSuccess: refresh,
        onError: (error: unknown) => toast.error(mutationErrorMessage(error)),
    });
    const resolve = useMutation({
        mutationFn: (team: number) => resolveMatch(matchId, team, reason),
        onSuccess: refresh,
        onError: (error: unknown) => toast.error(mutationErrorMessage(error)),
    });
    if (match.isLoading) return <p className="text-muted-foreground">{t("async.match")}</p>;
    if (match.isError || !match.data)
        return (
            <p className="text-destructive" role="alert">
                {t("match.loadingError")}
            </p>
        );
    const data = match.data;
    const needed1 = Math.max(0, (data.majorityRequired ?? 0) - (data.votes?.team1 ?? 0));
    const needed2 = Math.max(0, (data.majorityRequired ?? 0) - (data.votes?.team2 ?? 0));
    return (
        <section className="rounded-xl border p-4 sm:p-6 space-y-4">
            <h2 className="text-xl font-semibold">{t("match.result")}</h2>
            {data.status === "finished" ? (
                <div className="space-y-4">
                    <p className="font-medium">
                        {t("match.finished", {
                            team: data.winnerTeamNumber ?? "—",
                            resolution:
                                data.resolutionType === "admin"
                                    ? labelResolution("admin")
                                    : t("enum.resolution.majority"),
                        })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild>
                            <Link to={`/matches/${data.id}`}>{t("match.viewDetails")}</Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link to={`/leagues/${data.leagueId}#standings`}>
                                {t("match.viewStandings")}
                            </Link>
                        </Button>
                        <Button asChild variant="ghost">
                            <Link to={`/leagues/${data.leagueId}`}>{t("match.backToLeague")}</Link>
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    <p className="text-sm text-muted-foreground">
                        {t("match.majority", {
                            required: formatNumber(data.majorityRequired ?? 0),
                            team1: formatNumber(needed1),
                            team2: formatNumber(needed2),
                        })}
                    </p>
                    <p className="font-medium">{t("match.votePrivate")}</p>
                    <div className="flex flex-wrap gap-2">
                        {[1, 2].map(team => (
                            <Button
                                key={team}
                                variant="outline"
                                disabled={vote.isPending}
                                onClick={() => vote.mutate(team)}
                            >
                                {t("match.voteTeam", { team })}
                            </Button>
                        ))}
                    </div>
                    {canResolve && (
                        <div className="border-t pt-4 space-y-3">
                            <p className="font-medium">{t("match.resolve")}</p>
                            <Input
                                value={reason}
                                onChange={event => setReason(event.target.value)}
                                placeholder={t("match.justification")}
                            />
                            <div className="flex gap-2">
                                {[1, 2].map(team => (
                                    <Button
                                        key={team}
                                        variant="outline"
                                        disabled={resolve.isPending || reason.trim().length < 5}
                                        onClick={() => resolve.mutate(team)}
                                    >
                                        {t("match.awardTeam", { team })}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
