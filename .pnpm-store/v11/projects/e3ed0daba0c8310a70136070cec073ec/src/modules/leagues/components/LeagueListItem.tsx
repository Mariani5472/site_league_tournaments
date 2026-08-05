import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import type { League } from "../types/league";

interface Props {
  league: League;
}

export function LeagueListItem({
  league,
}: Props) {
  return (
    <Link
      to={`/leagues/${league.id}`}
      className="
        group
        flex
        flex-col
        gap-4
        rounded-xl
        border
        p-5
        transition-colors
        hover:bg-muted/50
        md:flex-row
        md:items-center
        md:justify-between
      "
    >
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            className="
              truncate
              text-lg
              font-semibold
              group-hover:underline
            "
          >
            {league.name}
          </h2>

          <Badge variant="outline">
            {league.visibility}
          </Badge>
        </div>

        <p
          className="
            line-clamp-2
            text-sm
            text-muted-foreground
          "
        >
          {league.description}
        </p>
      </div>

      <div
        className="
          flex
          flex-wrap
          items-center
          gap-x-5
          gap-y-2
          text-sm
          text-muted-foreground
          md:justify-end
        "
      >
        <span>
          👥 {league.player_count} / {league.max_players} jogadores
        </span>

        <span>
          {league.join_policy === "request"
            ? "Solicitação para entrar"
            : "Entrada livre"}
        </span>

      </div>
    </Link>
  );
}
