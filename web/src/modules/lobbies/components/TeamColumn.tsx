import type { LobbyPlayer } from "../types/lobby.types";
import { PlayerCard } from "./PlayerCard";
interface Props {
    title: string;
    players: LobbyPlayer[];
}
export function TeamColumn({ title, players, }: Props) {
    return (<div className="
        rounded-xl
        border
        p-5
        space-y-4
      ">
      <div className="
          flex
          justify-between
        ">
        <h2 className="
            font-semibold
            text-lg
          ">
          {title}
        </h2>

        <span>
          {players.length}
        </span>
      </div>

      {players.length === 0 &&
            (<p className="
              text-muted-foreground
              text-sm
            ">
            Empty
          </p>)}

      {players.map(player => (<PlayerCard key={player.userId} player={player}/>))}
    </div>);
}
