import { useMutation } from "@tanstack/react-query";
import { joinLeague, requestLeagueJoin } from "../services/leagues.service";
import type { League } from "../types/league";
import { toast } from "sonner";

type Props = {
  league: League;
};

export function LeagueJoinActions({league}: Props) {  
  const joinMutation = useMutation({
    mutationFn: () => joinLeague(league.id),
    onSuccess: () => toast.success("You joined the league"),
    onError: (error) => toast.error(error.message || "Failed to enter league")
  });

  const requestMutation = useMutation({
    mutationFn: () => requestLeagueJoin(league.id),
    onSuccess: () => toast.success("Request sent"),
    onError: (error) => toast.error(error.message || "Failed to send request")
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