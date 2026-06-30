import type { Lobby } from "../types/lobby.types";
interface Props {
  lobby: Lobby;
}

export function LobbyHeader({
  lobby,
}: Props) {
  return (
    <div
      className="
        rounded-xl
        border
        p-6
        flex
        justify-between
        items-center
      "
    >
      <div>
        <h1
          className="
            text-3xl
            font-bold
          "
        >
          Lobby
        </h1>

        <p
          className="
            text-muted-foreground
          "
        >
          Waiting for players...
        </p>
      </div>

      <div
        className="
          text-right
        "
      >
        <p className="font-semibold">
          {lobby.players.length}
          /
          {lobby.max_players}
        </p>

        <span
          className="
            text-sm
            text-muted-foreground
          "
        >
          Players
        </span>
      </div>
    </div>
  );
}