import { Link } from "react-router-dom";
import { ArrowRight, Lock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { League } from "../types/league";
import { t } from "@/i18n";
import { labelJoinPolicy, labelVisibility } from "@/i18n/labels";
export function LeagueListItem({ league }: {
    league: League;
}) {
    return (<Link to={`/leagues/${league.id}`} className="group flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-lg font-semibold tracking-tight group-hover:text-primary">{league.name}</h3>
          <Badge variant="outline">{league.visibility === "private" && <Lock className="mr-1 h-3 w-3"/>}{labelVisibility(league.visibility)}</Badge>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{league.description || t("league.noDescription")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground md:justify-end">
        <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4"/> {league.playerCount} / {league.maxPlayers} {t("common.players")}</span>
        <span>{labelJoinPolicy(league.joinPolicy)}</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
      </div>
    </Link>);
}
