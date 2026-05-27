import { useMutation } from "@tanstack/react-query";
import { joinLeague, requestLeagueJoin } from "../services/leagues.service";
import type { League } from "../types/league";

type Props = {
  league: League;
};

export function LeagueJoinActions({league}: Props) {  
  const joinMutation = useMutation({
    mutationFn: () => joinLeague(league.id)
  });

  const requestMutation = useMutation({
    mutationFn: () => requestLeagueJoin(league.id)
  });

  if (league.join_policy === "open") {
    return (
      <button
        onClick={() => joinMutation.mutate()}
        className="
          rounded-md
          bg-primary
          px-4
          py-2
          text-primary-foreground
        "
      >
        Join League
      </button>
    );
  }

  return (
    <button
      onClick={() => requestMutation.mutate()}
      className="
        rounded-md
        bg-primary
        px-4
        py-2
        text-primary-foreground
      "
    >
      Request Join
    </button>
  );
}