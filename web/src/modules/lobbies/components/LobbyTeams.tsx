import type { Lobby } from "../types/lobby.types";
import { TeamColumn } from "./TeamColumn";

interface Props {
  lobby: Lobby;
}

export function LobbyTeams({
  lobby,
}: Props) {

  const blueTeam =
    lobby.players.filter(
      player =>
        player.team_number === 1
    );

  const redTeam =
    lobby.players.filter(
      player =>
        player.team_number === 2
    );

  return (
    <div
      className="
        grid
        gap-6
        lg:grid-cols-2
      "
    >
      <TeamColumn
        title="Blue Team"
        players={blueTeam}
      />

      <TeamColumn
        title="Red Team"
        players={redTeam}
      />
    </div>
  );
}