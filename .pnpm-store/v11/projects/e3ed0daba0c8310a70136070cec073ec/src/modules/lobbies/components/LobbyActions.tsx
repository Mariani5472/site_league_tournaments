import { Button } from "@/components/ui/button";
import type { LobbyPlayer } from "../types/lobby.types";

interface Props {
  currentPlayer?: LobbyPlayer;

  join: () => void;
  leave: () => void;
  ready: () => void;
  unready: () => void;
  switchTeam: () => void;
  deleteLobby: () => void;
  startMatch?: () => void;
  isLoading?: boolean;
}

export function LobbyActions({
  currentPlayer,
  join,
  leave,
  ready,
  unready,
  deleteLobby,
  switchTeam,
  startMatch,
  isLoading,
}: Props) {

  return (
    <div
      className="
        rounded-xl
        border
        p-5
        flex
        gap-3
        flex-wrap
      "
    >

      <Button
        onClick={join}
      >
        Join
      </Button>

      {currentPlayer && (
        <>
          <Button
            variant="secondary"
            onClick={currentPlayer.is_ready ? unready : ready}
          >
            {currentPlayer.is_ready ? "Unready" : "Ready"}
          </Button>

          <Button
            variant="outline"
            onClick={switchTeam}
          >
            Switch to Team {currentPlayer.team_number == 1 ? 'Red' : "Blue"}
          </Button>

          <Button
            variant="outline"
            onClick={leave}
          >
            Leave
          </Button>
        </>
      )}

      <Button
        disabled={isLoading}
        onClick={startMatch}
      >
        Start Match
      </Button>

      <Button
        disabled={isLoading}
        onClick={deleteLobby}
      >
        Delete Lobby
      </Button>

    </div>

  );

}