import type { Lobby } from "../types/lobby.types";

interface Props {
  lobby: Lobby;
}

export function LobbyHeader({
  lobby
}: Props) {
  const playersCount = lobby.players.length;
  return (
    <div
      className="
        rounded-xl
        border
        p-6
        space-y-3
      "
    >
      <h1
        className="
          text-3xl
          font-bold
        "
      >
        Lobby
      </h1>

      <p>
        Status:
        {" "}
        <strong>
          {lobby.status}
        </strong>
      </p>

      <p>
        Players:
        {" "}
        {playersCount}
        /
        {lobby.max_players}
      </p>
    </div>
  )
}