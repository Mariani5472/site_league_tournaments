import { useParams } from "react-router-dom";

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

export function LobbyPage() {
    const { leagueId, lobbyId } = useParams();
    const { user } = useAuth();
    const {
      data: lobby,
      isLoading
    } = useLobby(leagueId!, lobbyId!);

    useLobbySocket(leagueId!, lobbyId!);
    const actions = useLobbyActions(leagueId!, lobbyId!);
    const queryClient = useQueryClient();
    const members = useLeagueMembers(leagueId!);
    const role = useLeagueRole(members.data ?? []);
    const start = useMutation({ mutationFn: () => startLobby(leagueId!, lobbyId!), onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lobby", leagueId, lobbyId] });
      queryClient.invalidateQueries({ queryKey: ["league-matches", leagueId] });
      toast.success("Match started");
    }, onError: (error: Error) => toast.error(error.message) });


    if (isLoading) {
        return <>Loading...</>
    }

    if (!lobby) {
        return <>Lobby not found</>
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
