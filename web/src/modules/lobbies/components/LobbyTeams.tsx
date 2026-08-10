import type { LobbyDetails } from "../types/lobby.types";
import { TeamColumn } from "./TeamColumn";

interface Props {
  lobby: LobbyDetails;
}

export function LobbyTeams({
  lobby,
}: Props) {

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
        players={lobby.teams.team_1.players}
      />

      <TeamColumn
        title="Red Team"
        players={lobby.teams.team_2.players}
      />
    </div>
  );
}