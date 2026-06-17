import type { LobbyPlayer } from "../types/lobby.types";
import { PlayerCard } from "./PlayerCard";

interface Props {
  title: string;
  players: LobbyPlayer[];
}

export function TeamColumn({
  title,
  players
}: Props) {

  return (
  <div
    className="
      border
      rounded-xl
      p-4
      space-y-3
    "
  >
    <h2
      className="
        text-xl
        font-bold
      "
    >
      {title}
    </h2>
    {players.map(player => (
      <PlayerCard
        key={player.user_id}
        player={player}
      />
    ))}
  </div>
  )
}