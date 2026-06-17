import { useParams } from "react-router-dom";
import { useLobby } from "../hooks/useLobby";
import { useLobbySocket } from "../hooks/useLobbySocket";
import { LobbyHeader } from "../components/LobbyHeader";
import { LobbyTeams } from "../components/LobbyTeams";

export function LobbyPage() {
  const { lobbyId } = useParams();
  const { 
    data: lobby, 
    isLoading,
  } = useLobby(lobbyId!);
  useLobbySocket(lobbyId!);

  if (isLoading) {
    return (
      <div>
        Loading...
      </div>
    );
  }

  if (!lobby) {
    return (
      <div>
        Lobby not found
      </div>
    );
  }

  return (
    <div
      className="
        max-w-7xl
        mx-auto
        p-6
        space-y-6
      "
    >
      <LobbyHeader
        lobby={lobby}
      />

      <LobbyTeams
        lobby={lobby}
      />
    </div>
  );
}