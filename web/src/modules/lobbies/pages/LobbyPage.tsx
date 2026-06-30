import { useParams } from "react-router-dom";

import { useLobby } from "../hooks/useLobby";
import { useLobbySocket } from "../hooks/useLobbySocket";
import { LobbyTeams } from "../components/LobbyTeams";
import { LobbyActions } from "../components/LobbyActions";
import { LobbyHeader } from "../components/LobbyHeader";
import { LobbyStatus } from "../components/LobbyStatus";
import { useLobbyActions } from "../hooks/useLobbyActions";

export function LobbyPage() {
    const { lobbyId } = useParams();
    const {
      data: lobby,
      isLoading
    } = useLobby(lobbyId!);

    useLobbySocket(lobbyId!);
    const actions = useLobbyActions(lobbyId!);

    if (isLoading) {
        return <>Loading...</>
    }

    if (!lobby) {
        return <>Lobby not found</>
    }

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
                {...actions}
            />

            <LobbyTeams
                lobby={lobby}
                {...actions}
            />
        </div>
    )
}