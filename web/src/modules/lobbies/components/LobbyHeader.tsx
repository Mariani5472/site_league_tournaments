import type { LobbyDetails } from "../types/lobby.types";
import { t } from "@/i18n";
interface Props {
    lobby: LobbyDetails;
}
export function LobbyHeader({ lobby, }: Props) {
    return (<div className="
        rounded-xl
        border
        p-6
        flex
        justify-between
        items-center
      ">
      <div>
        <h1 className="
            text-3xl
            font-bold
          ">
          {t("lobby.title")}
        </h1>

        <p className="
            text-muted-foreground
          ">
          {t("lobby.waiting")}
        </p>
      </div>

      <div className="
          text-right
        ">
        <span className="
            text-sm
            text-muted-foreground
          ">
          {t("common.players")}
        </span>
        <p className="font-semibold">
          {lobby.playersCount}
          /
          {lobby.maxPlayers}
        </p>
      </div>
    </div>);
}
