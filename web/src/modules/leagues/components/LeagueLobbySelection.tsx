import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeagueLobbyCard } from "./LeagueLobbyCard";
import { CreateLobbyDialog } from "./CreateLobbyDialog";
import type { Lobby } from "@/modules/lobbies/types/lobby.types";
import { t } from "@/i18n";
interface Props {
    leagueId: string;
    lobbies: Lobby[];
    canCreateLobby: boolean;
}
export function LeagueLobbySection({ leagueId, lobbies, canCreateLobby }: Props) {
    return (
        <section
            className="
        rounded-xl
        border
        p-6
        space-y-6
      "
        >
            <div
                className="
          flex
          items-center
          justify-between
        "
            >
                <div>
                    <h2
                        className="
              text-2xl
              font-bold
            "
                    >
                        {t("league.lobbies")}
                    </h2>

                    <p
                        className="
              text-muted-foreground
            "
                    >
                        {t("league.lobbiesDescription")}
                    </p>
                </div>

                {canCreateLobby && (
                    <CreateLobbyDialog leagueId={leagueId}>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            {t("league.createLobby")}
                        </Button>
                    </CreateLobbyDialog>
                )}
            </div>

            {lobbies.length === 0 ? (
                <div
                    className="
            rounded-lg
            border
            border-dashed
            p-12
            text-center
          "
                >
                    <p
                        className="
              text-muted-foreground
            "
                    >
                        {t("league.lobbiesEmpty")}
                    </p>
                </div>
            ) : (
                <div
                    className="
            grid
            gap-4
            lg:grid-cols-2
          "
                >
                    {lobbies.map(lobby => (
                        <LeagueLobbyCard key={lobby.id} leagueId={leagueId} lobby={lobby} />
                    ))}
                </div>
            )}
        </section>
    );
}
