import { Badge } from "@/components/ui/badge";
import type { LobbyDetails } from "../types/lobby.types";


interface Props {
  lobby: LobbyDetails;
}

export function LobbyStatus({
  lobby,
}: Props) {

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

          {lobby.ready_count}

          /

          {lobby.players_count}
        </p>
      </div>

      <Badge>
        {lobby.status}
      </Badge>
    </div>
  );
}