import { Button } from "@/components/ui/button";
import type { League } from "../types/league";
import { LeagueJoinActions } from "./LeagueJoinActions";
import { useMutation } from "@tanstack/react-query";
import { leaveLeague } from "../services/leagues.service";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Settings, Shield, Users } from "lucide-react";
import { mutationErrorMessage } from "@/services/api-errors";
import { t } from "@/i18n";
import { labelJoinPolicy, labelRole, labelVisibility } from "@/i18n/labels";
type Props = {
    league: League;
    isAdmin: boolean;
    isOwner: boolean;
    role: "owner" | "admin" | "player" | "spec" | null;
};
export function LeagueHeader({ league, isAdmin, isOwner, role }: Props) {
    const navigate = useNavigate();
    const leaveMutation = useMutation({
        mutationFn: () => leaveLeague(league.id),
        onSuccess: () => {
            toast.success(t("league.left"));
            navigate("/leagues");
        },
        onError: (error: unknown) => toast.error(mutationErrorMessage(error)),
    });
    return (
        <header className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="border-b bg-muted/30 px-5 py-3 sm:px-7">
                <Link
                    to="/leagues"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" /> {t("league.back")}
                </Link>
            </div>
            <div className="flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap gap-2">
                        <span
                            className="
              rounded-md
              border
              px-2
              py-1
              text-xs
            "
                        >
                            {labelVisibility(league.visibility)}
                        </span>

                        <span
                            className="
              rounded-md
              border
              px-2
              py-1
              text-xs
            "
                        >
                            {labelJoinPolicy(league.joinPolicy)}
                        </span>
                    </div>
                    <h1 className="break-words text-3xl font-bold tracking-tight sm:text-4xl">
                        {league.name}
                    </h1>
                    <p className="max-w-3xl text-muted-foreground">
                        {league.description || t("league.noDescription")}
                    </p>
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" /> {league.playerCount ?? 0} /{" "}
                        {league.maxPlayers} {t("common.members")}
                    </p>
                </div>
                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap lg:max-w-sm lg:justify-end">
                    {isAdmin && (
                        <Button variant="outline" asChild>
                            <Link to={`/leagues/${league.id}/settings`}>
                                <Settings className="h-4 w-4" /> {t("league.settings")}
                            </Link>
                        </Button>
                    )}
                    {!role && <LeagueJoinActions league={league} />}
                    {role && !isOwner && (
                        <Button
                            variant="outline"
                            disabled={leaveMutation.isPending}
                            onClick={() => leaveMutation.mutate()}
                        >
                            {leaveMutation.isPending ? t("league.leaving") : t("league.leave")}
                        </Button>
                    )}
                    {role && (
                        <span className="inline-flex items-center justify-center gap-2 rounded-md bg-primary/5 px-3 py-2 text-sm font-medium text-primary">
                            <Shield className="h-4 w-4" /> {labelRole(role)}
                        </span>
                    )}
                </div>
            </div>
        </header>
    );
}
