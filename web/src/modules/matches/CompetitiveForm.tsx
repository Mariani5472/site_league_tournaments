import { t, tp } from "@/i18n";

type Result = "win" | "loss";

function resultLabel(result: Result) {
    return result === "win" ? t("match.formWin") : t("match.formLoss");
}

export function CompetitiveForm({
    recentForm,
    currentStreak,
    currentStreakResult,
    compact = false,
}: {
    recentForm: Result[];
    currentStreak: number;
    currentStreakResult: Result | null;
    compact?: boolean;
}) {
    if (!recentForm.length || !currentStreakResult || currentStreak === 0) {
        return <span className="text-sm text-muted-foreground">{t("match.formEmpty")}</span>;
    }

    const streak =
        currentStreakResult === "win"
            ? tp(currentStreak, {
                  one: "match.winStreak.one",
                  other: "match.winStreak.other",
              })
            : tp(currentStreak, {
                  one: "match.lossStreak.one",
                  other: "match.lossStreak.other",
              });

    return (
        <div className={compact ? "space-y-1" : "space-y-2"}>
            <ol className="flex flex-wrap gap-1" aria-label={t("match.recentForm")}>
                {recentForm.map((result, index) => (
                    <li
                        key={`${index}-${result}`}
                        title={resultLabel(result)}
                        className={
                            result === "win"
                                ? "grid h-7 min-w-7 place-items-center rounded-md bg-success/15 px-2 text-xs font-semibold text-success"
                                : "grid h-7 min-w-7 place-items-center rounded-md bg-destructive/15 px-2 text-xs font-semibold text-destructive"
                        }
                    >
                        <span aria-hidden="true">
                            {result === "win" ? t("match.formWinShort") : t("match.formLossShort")}
                        </span>
                        <span className="sr-only">{resultLabel(result)}</span>
                    </li>
                ))}
            </ol>
            {!compact && <p className="text-xs text-muted-foreground">{streak}</p>}
        </div>
    );
}
