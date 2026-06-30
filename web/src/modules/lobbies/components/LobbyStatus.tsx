import { Badge } from "@/components/ui/badge";
import type { Lobby } from "../types/lobby.types";


interface Props {
  lobby: Lobby;
}

export function LobbyStatus({
  lobby,
}: Props) {
  const readyPlayers =
    lobby.players.filter(
      player => player.is_ready
    ).length;

  return (
    <div
      className="
        rounded-xl
        border
        p-5
        flex
        justify-between
        items-center
      "
    >
      <div>
        <h2
          className="
            font-semibold
          "
        >
          Lobby Status
        </h2>

        <p
          className="
            text-muted-foreground
          "
        >
          Ready Players

          {" "}

          {readyPlayers}

          /

          {lobby.players.length}
        </p>
      </div>

      <Badge>
        {lobby.status}
      </Badge>
    </div>
  );
}