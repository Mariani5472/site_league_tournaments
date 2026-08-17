import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Dices, RefreshCw, Scale, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/queryKeys";
import {
    confirmTeamSelection,
    draftPick,
    finalizeCaptains,
    voteCaptain,
    voteTeamSelection,
} from "../services/lobbies.service";
import type { LobbyDetails, TeamSelectionMode } from "../types/lobby.types";
import { formatNumber, t } from "@/i18n";
import { mutationErrorMessage } from "@/services/api-errors";
const options: Array<{
    mode: TeamSelectionMode;
    title: string;
    description: string;
    icon: typeof Dices;
}> = [
    {
        mode: "random",
        title: t("selection.random"),
        description: t("selection.randomDescription"),
        icon: Dices,
    },
    {
        mode: "balanced",
        title: t("selection.balanced"),
        description: t("selection.balancedDescription"),
        icon: Scale,
    },
    {
        mode: "player_picks",
        title: t("selection.picks"),
        description: t("selection.picksDescription"),
        icon: UsersRound,
    },
];
export function TeamSelection({ lobby }: { lobby: LobbyDetails }) {
    const selection = lobby.teamSelection;
    const client = useQueryClient();
    const [seconds, setSeconds] = useState(60);
    const refresh = () =>
        client.invalidateQueries({ queryKey: queryKeys.lobbies.detail(lobby.leagueId, lobby.id) });
    const mutationOptions = {
        onSuccess: refresh,
        onError: (error: unknown) => toast.error(mutationErrorMessage(error)),
    };
    const vote = useMutation({
        mutationFn: (mode: TeamSelectionMode) => voteTeamSelection(lobby.leagueId, lobby.id, mode),
        ...mutationOptions,
    });
    const confirm = useMutation({
        mutationFn: (decision: "accept" | "reroll") =>
            confirmTeamSelection(lobby.leagueId, lobby.id, decision),
        ...mutationOptions,
    });
    const captainVote = useMutation({
        mutationFn: (id: string) => voteCaptain(lobby.leagueId, lobby.id, id),
        ...mutationOptions,
    });
    const finalize = useMutation({
        mutationFn: () => finalizeCaptains(lobby.leagueId, lobby.id),
        ...mutationOptions,
    });
    const pick = useMutation({
        mutationFn: (id: string) => draftPick(lobby.leagueId, lobby.id, id),
        ...mutationOptions,
    });
    const endsAt = selection?.captainVote?.endsAt
        ? new Date(selection.captainVote.endsAt).getTime()
        : null;
    useEffect(() => {
        if (!endsAt) return;
        const tick = () => setSeconds(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
        tick();
        const timer = window.setInterval(tick, 1000);
        return () => window.clearInterval(timer);
    }, [endsAt]);
    useEffect(() => {
        if (endsAt && seconds === 0 && !finalize.isPending) finalize.mutate();
    }, [endsAt, seconds]); // eslint-disable-line react-hooks/exhaustive-deps
    if (!selection?.available && !selection?.mode) return null;
    if (selection.completed)
        return (
            <section className="rounded-2xl border border-success/30 bg-success/5 p-5">
                <h2 className="font-semibold text-success">{t("selection.completed")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t("selection.completedDescription", {
                        mode: options.find(option => option.mode === selection.mode)?.title ?? "—",
                    })}
                </p>
                <p className="mt-2 font-medium">
                    {t("selection.readyHint", {
                        ready: formatNumber(lobby.readyCount),
                        total: formatNumber(lobby.playersCount),
                    })}
                </p>
            </section>
        );
    if (selection.mode === "random" && selection.confirmation)
        return (
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
                <h2 className="text-xl font-semibold">
                    {t("selection.randomTitle", { round: formatNumber(selection.round) })}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t("selection.majorityHint", {
                        count: formatNumber(selection.majorityRequired),
                    })}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Button
                        size="lg"
                        variant={selection.confirmation.myVote === "accept" ? "default" : "outline"}
                        disabled={!selection.canVote || confirm.isPending}
                        onClick={() => confirm.mutate("accept")}
                    >
                        <Check className="mr-2 h-4 w-4" />
                        {t("selection.accept", {
                            votes: selection.confirmation.votes.accept,
                            required: selection.majorityRequired,
                        })}
                    </Button>
                    <Button
                        size="lg"
                        variant={
                            selection.confirmation.myVote === "reroll" ? "destructive" : "outline"
                        }
                        disabled={!selection.canVote || confirm.isPending}
                        onClick={() => confirm.mutate("reroll")}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t("selection.reroll", {
                            votes: selection.confirmation.votes.reroll,
                            required: selection.majorityRequired,
                        })}
                    </Button>
                </div>
            </section>
        );
    if (selection.mode === "player_picks" && selection.captainVote)
        return (
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h2 className="text-xl font-semibold">{t("selection.voteCaptains")}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t("selection.captainsHint")}
                        </p>
                    </div>
                    <strong className="rounded-full bg-primary/10 px-4 py-2 text-primary">
                        {t("common.seconds", { count: formatNumber(seconds) })}
                    </strong>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    {selection.captainVote.candidates.map(candidate => (
                        <Button
                            key={candidate.userId}
                            variant={
                                selection.captainVote?.myVote === candidate.userId
                                    ? "default"
                                    : "outline"
                            }
                            disabled={!selection.canVote || captainVote.isPending || seconds === 0}
                            onClick={() => captainVote.mutate(candidate.userId)}
                            className="h-auto justify-between py-3"
                        >
                            <span className="truncate">{candidate.nickname}</span>
                            <strong>{formatNumber(candidate.votes)}</strong>
                        </Button>
                    ))}
                </div>
                {seconds === 0 && (
                    <p className="mt-3 text-sm text-muted-foreground">{t("selection.counting")}</p>
                )}
            </section>
        );
    if (selection.mode === "player_picks" && selection.draft) {
        const myId = lobby.currentPlayer?.userId;
        const myTeam =
            myId === selection.draft.captain1 ? 1 : myId === selection.draft.captain2 ? 2 : null;
        return (
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
                <h2 className="text-xl font-semibold">{t("selection.picks")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t("selection.draftTurn", { team: selection.draft.nextTeam ?? "—" })}
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {selection.draft.availablePlayers.map(player => (
                        <Button
                            key={player.userId}
                            variant="outline"
                            disabled={pick.isPending || myTeam !== selection.draft?.nextTeam}
                            onClick={() => pick.mutate(player.userId)}
                        >
                            {player.nickname}
                        </Button>
                    ))}
                </div>
                {!myTeam && (
                    <p className="mt-3 text-sm text-muted-foreground">
                        {t("selection.watchDraft")}
                    </p>
                )}
            </section>
        );
    }
    return (
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="text-xl font-semibold">{t("selection.question")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
                {t("selection.voteHint", { count: formatNumber(selection.majorityRequired) })}
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
                {options.map(({ mode, title, description, icon: Icon }) => (
                    <button
                        key={mode}
                        disabled={vote.isPending || !selection.canVote}
                        onClick={() => vote.mutate(mode)}
                        className={`rounded-xl border p-4 text-left transition-all hover:border-primary/40 disabled:opacity-60 ${selection.myVote === mode ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "bg-background"}`}
                    >
                        <span className="flex items-center justify-between">
                            <Icon className="h-5 w-5 text-primary" />
                            <strong>
                                {formatNumber(selection.votes[mode])}/
                                {formatNumber(selection.majorityRequired)}
                            </strong>
                        </span>
                        <span className="mt-4 block font-semibold">{title}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">
                            {description}
                        </span>
                    </button>
                ))}
            </div>
        </section>
    );
}
