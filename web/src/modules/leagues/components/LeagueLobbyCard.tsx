import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { Lobby } from "@/modules/lobbies/types/lobby.types";
import { t } from "@/i18n";
import { labelLobbyStatus } from "@/i18n/labels";
import { LobbyStatusBadge } from "@/components/SemanticBadge";
interface Props {
    leagueId: string;
    lobby: Lobby;
}
export function LeagueLobbyCard({ leagueId, lobby }: Props) {
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
                        {t("league.lobby")}
                    </h3>

                    <p
                        className="
              text-sm
              text-muted-foreground
            "
                    >
                        {t("common.status", { status: labelLobbyStatus(lobby.status) })}
                    </p>
                </div>

                <LobbyStatusBadge status={lobby.status} />
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
                {lobby.playersCount}/{lobby.maxPlayers}
            </div>

            <Button onClick={() => navigate(`/leagues/${leagueId}/lobbies/${lobby.id}`)}>
                {isWaiting ? t("league.openLobby") : t("league.watchMatch")}
            </Button>
        </div>
    );
}
