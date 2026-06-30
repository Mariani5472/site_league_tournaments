import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LeagueLobby } from "../types/LeagueLobby";
import { LeagueLobbyCard } from "./LeagueLobbyCard";
import { CreateLobbyDialog } from "./CreateLobbyDialog";


interface Props {
  leagueId: string;
  lobbies: LeagueLobby[];
  isAdmin: boolean;
}

export function LeagueLobbySection({
  leagueId,
  lobbies,
  isAdmin
}: Props) {
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
            Lobbies
          </h2>

          <p
            className="
              text-muted-foreground
            "
          >
            Join an existing lobby or create a new one.
          </p>
        </div>

        {isAdmin && (
          <CreateLobbyDialog
            leagueId={leagueId}
          >
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Lobby
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
            No lobby created yet.
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
          {lobbies.map((lobby) => (
            <LeagueLobbyCard
              key={lobby.id}
              leagueId={leagueId}
              lobby={lobby}
            />
          ))}
        </div>
      )}
    </section>
  );
}