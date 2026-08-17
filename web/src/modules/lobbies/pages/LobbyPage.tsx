import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLobby } from "../hooks/useLobby";
import { useLobbySocket } from "../hooks/useLobbySocket";
import { LobbyTeams } from "../components/LobbyTeams";
import { LobbyActions } from "../components/LobbyActions";
import { LobbyHeader } from "../components/LobbyHeader";
import { LobbyStatus } from "../components/LobbyStatus";
import { useLobbyActions } from "../hooks/useLobbyActions";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startLobby } from "../services/lobbies.service";
import { Button } from "@/components/ui/button";
import { MatchVoting } from "@/modules/matches/MatchVoting";
import { useLeagueMembers } from "@/modules/leagues/hooks/useLeagueMembers";
import { useLeagueRole } from "@/modules/leagues/hooks/useLeagueRole";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import { useLeagueSocket } from "@/modules/leagues/hooks/useLeagueSocket";
import { ArrowLeft } from "lucide-react";
import { TeamSelection } from "../components/TeamSelection";
import { t } from "@/i18n";
import { mutationErrorMessage } from "@/services/api-errors";
import { LobbyPhaseHeader } from "../components/LobbyPhaseHeader";
export function LobbyPage() {
    const { leagueId, lobbyId } = useParams();
    const { user } = useAuth();
    const { data: lobby, isLoading, isError, refetch } = useLobby(leagueId!, lobbyId!);
    const realtimeStatus = useLobbySocket(leagueId!, lobbyId!);
    useLeagueSocket(leagueId!);
    const actions = useLobbyActions(leagueId!, lobbyId!);
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const members = useLeagueMembers(leagueId!);
    const role = useLeagueRole(members.data ?? []);
    const start = useMutation({
        mutationFn: () => startLobby(leagueId!, lobbyId!),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.lobbies.detail(leagueId!, lobbyId!),
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.leagues.matches(leagueId!) });
            toast.success(t("lobby.started"));
        },
        onError: (error: unknown) => toast.error(mutationErrorMessage(error)),
    });
    useEffect(() => {
        if (lobby?.status === "cancelled") navigate(`/leagues/${leagueId}`, { replace: true });
    }, [leagueId, lobby?.status, navigate]);
    if (isLoading) {
        return <p className="text-muted-foreground">{t("common.loading")}</p>;
    }
    if (isError || !lobby) {
        return (
            <div className="rounded-xl border p-6 space-y-3">
                <p className="text-destructive" role="alert">
                    {t("lobby.loadError")}
                </p>
                <button className="underline" onClick={() => refetch()}>
                    {t("common.retry")}
                </button>
            </div>
        );
    }
    const me = lobby.players.find(player => player.userId === user?.id);
    return (
        <div
            className="
                container
                mx-auto
                py-8
                space-y-6
            "
        >
            <Button
                variant="ghost"
                className="w-fit"
                onClick={() => navigate(`/leagues/${leagueId}`)}
            >
                <ArrowLeft className="h-4 w-4" /> {t("lobby.back")}
            </Button>

            <LobbyHeader lobby={lobby} />
            <LobbyPhaseHeader lobby={lobby} realtimeStatus={realtimeStatus} />
            <LobbyStatus lobby={lobby} />

            <TeamSelection lobby={lobby} />

            <LobbyActions
                currentPlayer={me}
                status={lobby.status}
                canManage={role.isAdmin}
                teamSelectionLocked={Boolean(
                    lobby.teamSelection?.available && !lobby.teamSelection.completed
                )}
                {...actions}
            />

            {role.isAdmin && lobby.status === "waiting" && (
                <Button
                    disabled={!lobby.canStart || start.isPending}
                    onClick={() => start.mutate()}
                >
                    {start.isPending ? t("lobby.starting") : t("lobby.start")}
                </Button>
            )}

            <LobbyTeams lobby={lobby} {...actions} />
            {lobby.matchId && <MatchVoting matchId={lobby.matchId} canResolve={role.isAdmin} />}
        </div>
    );
}
