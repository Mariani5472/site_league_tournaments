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
    isLoading?: boolean;
    status: "waiting" | "in_game" | "finished" | "cancelled";
    canManage: boolean;
    teamSelectionLocked?: boolean;
}
export function LobbyActions({ currentPlayer, join, leave, ready, unready, deleteLobby, switchTeam, isLoading, status, canManage, teamSelectionLocked, }: Props) {
    const isWaiting = status === "waiting";
    return (<div className="
        rounded-xl
        border
        p-5
        flex
        gap-3
        flex-wrap
      ">

      {!currentPlayer && <Button disabled={!isWaiting || isLoading} onClick={join}>Join</Button>}

      {currentPlayer && (<>
          <Button variant="secondary" disabled={!isWaiting || isLoading || teamSelectionLocked} onClick={currentPlayer.isReady ? unready : ready}>
            {currentPlayer.isReady ? "Cancelar prontidão" : "Confirmar prontidão"}
          </Button>

          <Button variant="outline" disabled={!isWaiting || isLoading || teamSelectionLocked} onClick={switchTeam}>
            Switch to Team {currentPlayer.teamNumber == 1 ? 'Red' : "Blue"}
          </Button>

          <Button variant="outline" disabled={!isWaiting || isLoading} onClick={leave}>
            Leave
          </Button>
        </>)}

      {canManage && isWaiting && <Button variant="destructive" disabled={isLoading} onClick={deleteLobby}>Cancel Lobby</Button>}

    </div>);
}
