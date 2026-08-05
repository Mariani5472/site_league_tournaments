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

export function LobbyPage() {
    const { leagueId, lobbyId } = useParams();
    const { user } = useAuth();
    const {
      data: lobby,
      isLoading,
      isError,
      refetch,
    } = useLobby(leagueId!, lobbyId!);

    useLobbySocket(leagueId!, lobbyId!);
    useLeagueSocket(leagueId!);
    const actions = useLobbyActions(leagueId!, lobbyId!);
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const members = useLeagueMembers(leagueId!);
    const role = useLeagueRole(members.data ?? []);
    const start = useMutation({ mutationFn: () => startLobby(leagueId!, lobbyId!), onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lobbies.detail(leagueId!, lobbyId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leagues.matches(leagueId!) });
      toast.success("Match started");
    }, onError: (error: Error) => toast.error(error.message) });

    useEffect(() => {
      if (lobby?.status === "cancelled") navigate(`/leagues/${leagueId}`, { replace: true });
    }, [leagueId, lobby?.status, navigate]);


    if (isLoading) {
        return <p className="text-muted-foreground">Carregando lobby...</p>
    }

    if (isError || !lobby) {
        return <div className="rounded-xl border p-6 space-y-3"><p className="text-destructive" role="alert">Não foi possível carregar o lobby.</p><button className="underline" onClick={() => refetch()}>Tentar novamente</button></div>
    }

    const me = lobby.players.find(player => player.user_id === user?.id);

    return(
        <div
            className="
                container
                mx-auto
                py-8
                space-y-6
            "
        >

            <LobbyHeader
                lobby={lobby}
            />
            <LobbyStatus
                lobby={lobby}
            />

            <LobbyActions
                currentPlayer={me}
                status={lobby.status}
                canManage={role.isAdmin}
                {...actions}
            />

            {role.isAdmin && lobby.status === "waiting" && (
              <Button disabled={!lobby.can_start || start.isPending} onClick={() => start.mutate()}>
                {start.isPending ? "Starting..." : "Start match"}
              </Button>
            )}

            <LobbyTeams
                lobby={lobby}
                {...actions}
            />
            {lobby.match_id && <MatchVoting matchId={lobby.match_id} canResolve={role.isAdmin} />}
        </div>
    )
}
