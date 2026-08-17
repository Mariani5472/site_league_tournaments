import { Check, Circle } from "lucide-react";
import { t } from "@/i18n";
import type { LobbyDetails } from "../types/lobby.types";

const phases = ["gathering", "forming", "ready", "playing", "voting", "finished"] as const;
type RealtimeStatus = "connecting" | "connected" | "disconnected" | "join_failed";

function currentPhase(lobby: LobbyDetails): (typeof phases)[number] {
    if (lobby.status === "finished") return "finished";
    if (lobby.status === "in_game") return "voting";
    if (lobby.playersCount < lobby.maxPlayers) return "gathering";
    if (lobby.teamSelection?.available && !lobby.teamSelection.completed) return "forming";
    return "ready";
}

export function LobbyPhaseHeader({
    lobby,
    realtimeStatus,
}: {
    lobby: LobbyDetails;
    realtimeStatus: RealtimeStatus;
}) {
    const active = currentPhase(lobby);
    const activeIndex = phases.indexOf(active);
    const blockers =
        lobby.status === "waiting"
            ? [
                  lobby.playersCount < lobby.maxPlayers
                      ? t("lobby.blocker.players", { count: lobby.maxPlayers - lobby.playersCount })
                      : null,
                  !lobby.isBalanced ? t("lobby.blocker.balance") : null,
                  lobby.teamSelection?.available && !lobby.teamSelection.completed
                      ? t("lobby.blocker.selection")
                      : null,
                  !lobby.everyoneReady
                      ? t("lobby.blocker.ready", { count: lobby.playersCount - lobby.readyCount })
                      : null,
              ].filter((item): item is string => Boolean(item))
            : [];
    return (
        <section className="rounded-xl border bg-card p-4 sm:p-5" aria-label={t("lobby.phases")}>
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {phases.map((phase, index) => (
                    <li
                        key={phase}
                        aria-current={phase === active ? "step" : undefined}
                        className={
                            phase === active
                                ? "font-semibold text-primary"
                                : "text-muted-foreground"
                        }
                    >
                        <span className="flex items-center gap-2 text-sm">
                            {index < activeIndex ? (
                                <Check className="h-4 w-4" />
                            ) : (
                                <Circle className="h-4 w-4" />
                            )}
                            {t(`lobby.phase.${phase}`)}
                        </span>
                    </li>
                ))}
            </ol>
            <p className="mt-4 text-sm">{t(`lobby.phaseHelp.${active}`)}</p>
            {blockers.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {blockers.map(blocker => (
                        <li key={blocker}>{blocker}</li>
                    ))}
                </ul>
            )}
            {realtimeStatus !== "connected" && (
                <p role="status" className="mt-3 text-xs text-warning-foreground dark:text-warning">
                    {t(`realtime.${realtimeStatus}`)}
                </p>
            )}
        </section>
    );
}
