import { useParams } from "react-router-dom";

import { useLobby } from "../hooks/useLobby";
import { useLobbySocket } from "../hooks/useLobbySocket";
import { LobbyTeams } from "../components/LobbyTeams";
import { LobbyActions } from "../components/LobbyActions";
import { LobbyHeader } from "../components/LobbyHeader";
import { LobbyStatus } from "../components/LobbyStatus";
import { useLobbyActions } from "../hooks/useLobbyActions";
import { useAuth } from "@/hooks/useAuth";

export function LobbyPage() {
    const { leagueId, lobbyId } = useParams();
    const { user } = useAuth();
    const {
      data: lobby,
      isLoading
    } = useLobby(leagueId!, lobbyId!);

    useLobbySocket(leagueId!, lobbyId!);
    const actions = useLobbyActions(leagueId!, lobbyId!);


    if (isLoading) {
        return <>Loading...</>
    }

    if (!lobby) {
        return <>Lobby not found</>
    }

    console.log(lobby)

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

            <LobbyTeams
                lobby={lobby}
                {...actions}
            />
        </div>
    )
}