import { CheckCircle2 } from "lucide-react";
import { LobbyPlayer } from "../types/lobby.types";

interface Props {
  player: LobbyPlayer;
}

export function PlayerCard({
  player
}: Props) {
  return (
  <div
    className="
      border
      rounded-lg
      p-3
      flex
      items-center
      justify-between
    "
  >
    <div>
      {player.nickname}
    </div>

    {player.is_ready && (
      <CheckCircle2
        className="
          h-5
          w-5
        "
      />
    )}
  </div>
  )
}