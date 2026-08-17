import { Badge } from "@/components/ui/badge";
import type { LobbyDetails } from "../types/lobby.types";
import { t } from "@/i18n";
import { labelLobbyStatus } from "@/i18n/labels";
interface Props {
    lobby: LobbyDetails;
}
export function LobbyStatus({ lobby }: Props) {
    return (
        <div
            className="
        rounded-xl
        border
        p-5
        flex
        justify-between
        items-center
      "
        >
            <div>
                <h2
                    className="
            font-semibold
          "
                >
                    {t("lobby.statusTitle")}
                </h2>

                <p
                    className="
            text-muted-foreground
          "
                >
                    {t("lobby.readyCount", { ready: lobby.readyCount, total: lobby.playersCount })}
                </p>
            </div>

            <Badge>{labelLobbyStatus(lobby.status)}</Badge>
        </div>
    );
}
