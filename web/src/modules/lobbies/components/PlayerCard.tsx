import { CheckCircle2 } from "lucide-react";
import type { LobbyPlayer } from "../types/lobby.types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
interface Props {
    player: LobbyPlayer;
}
export function PlayerCard({ player }: Props) {
    return (
        <div
            className="
        flex
        items-center
        justify-between
        rounded-lg
        border
        p-3
      "
        >
            <div
                className="
          flex
          items-center
          gap-3
        "
            >
                <Avatar>
                    <AvatarImage src={player.avatarUrl ?? undefined} />

                    <AvatarFallback>{player.nickname[0]}</AvatarFallback>
                </Avatar>

                <div>
                    <p className="font-medium">{player.nickname}</p>
                </div>
            </div>

            {player.isReady && (
                <CheckCircle2
                    className="
            text-success
          "
                />
            )}
        </div>
    );
}
