import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { Lobby } from "@/modules/lobbies/types/lobby.types";

interface Props {
  leagueId: string;
  lobby: Lobby;
}

export function LeagueLobbyCard({
  leagueId,
  lobby
}: Props) {
  const navigate = useNavigate();
  const isWaiting = lobby.status === "waiting";

  return (
    <div
      className="
        rounded-xl
        border
        p-5
        flex
        flex-col
        gap-4
      "
    >
      <div
        className="
          flex
          justify-between
          items-start
        "
      >
        <div>
          <h3
            className="
              font-semibold
              text-lg
            "
          >
            Lobby
          </h3>

          <p
            className="
              text-sm
              text-muted-foreground
            "
          >
            Status: {lobby.status}
          </p>
        </div>

        <span
          className="
            rounded-full
            border
            px-3
            py-1
            text-xs
          "
        >
          {lobby.status}
        </span>
      </div>

      <div
        className="
          flex
          items-center
          gap-2
          text-sm
        "
      >
        <Users
          className="
            h-4
            w-4
          "
        />

        {lobby.players_count}
        /
        {lobby.max_players}
      </div>

      <Button
        onClick={() => navigate(`/leagues/${leagueId}/lobbies/${lobby.id}`)}
      >
        {isWaiting ? "Open Lobby" : "Watch Match"}
      </Button>
    </div>
  );
}