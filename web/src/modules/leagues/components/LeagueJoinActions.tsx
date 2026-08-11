import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { joinLeague, requestLeagueJoin } from "../services/leagues.service";
import type { League } from "../types/league";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
type Props = {
    league: League;
};
export function LeagueJoinActions({ league }: Props) {
    const queryClient = useQueryClient();
    const refreshLeagues = () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.leagues.mine });
        queryClient.invalidateQueries({ queryKey: queryKeys.leagues.discoverAll });
        queryClient.invalidateQueries({ queryKey: queryKeys.leagues.detail(league.id) });
    };
    const joinMutation = useMutation({
        mutationFn: () => joinLeague(league.id),
        onSuccess: () => { refreshLeagues(); toast.success("You joined the league"); },
        onError: (error) => toast.error(error.message || "Failed to enter league")
    });
    const requestMutation = useMutation({
        mutationFn: () => requestLeagueJoin(league.id),
        onSuccess: () => { refreshLeagues(); toast.success("Request sent"); },
        onError: (error) => toast.error(error.message || "Failed to send request")
    });
    if (league.joinPolicy === "open") {
        return (<Button onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending}>
        {joinMutation.isPending ? "Joining..." : "Join League"}
      </Button>);
    }
    if (league.joinPolicy === "invite_only") {
        return <p className="text-sm text-muted-foreground">This league is invite-only.</p>;
    }
    return (<Button onClick={() => requestMutation.mutate()} disabled={requestMutation.isPending}>
      {requestMutation.isPending ? "Sending..." : "Request Join"}
    </Button>);
}
