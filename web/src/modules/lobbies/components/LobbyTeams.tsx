import type { LobbyDetails } from "../types/lobby.types";
import { TeamColumn } from "./TeamColumn";
import { t } from "@/i18n";
interface Props {
    lobby: LobbyDetails;
}
export function LobbyTeams({ lobby }: Props) {
    return (
        <div
            className="
        grid
        gap-6
        lg:grid-cols-2
      "
        >
            <TeamColumn title={t("lobby.blueTeam")} players={lobby.teams.team1.players} />

            <TeamColumn title={t("lobby.redTeam")} players={lobby.teams.team2.players} />
        </div>
    );
}
