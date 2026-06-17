import type { Lobby } from "../types/lobby.types";
import { TeamColumn } from "./TeamColumn";

interface Props {
  lobby: Lobby;
}

export function LobbyTeams({
  lobby
}: Props
) {
  const teamA = lobby.players.filter(player => player.team_number === 1);
  const teamB = lobby.players.filter(player => player.team_number === 2);

  return (
  <div
    className="
      grid
      md:grid-cols-2
      gap-6
    "
  >
    <TeamColumn
      title="Blue Team"
      players={teamA}
    />
    <TeamColumn
      title="Red Team"
      players={teamB}
    />
  </div>
  )
}