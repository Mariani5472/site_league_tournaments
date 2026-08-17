import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { joinLeague, requestLeagueJoin } from "../services/leagues.service";
import type { League } from "../types/league";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { mutationErrorMessage } from "@/services/api-errors";
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
        onSuccess: () => { refreshLeagues(); toast.success(t("league.joined")); },
        onError: (error) => toast.error(mutationErrorMessage(error))
    });
    const requestMutation = useMutation({
        mutationFn: () => requestLeagueJoin(league.id),
        onSuccess: () => { refreshLeagues(); toast.success(t("league.requestSent")); },
        onError: (error) => toast.error(mutationErrorMessage(error))
    });
    if (league.joinPolicy === "open") {
        return (<Button onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending}>
        {joinMutation.isPending ? t("league.joining") : t("league.join")}
      </Button>);
    }
    if (league.joinPolicy === "invite_only") {
        return <p className="text-sm text-muted-foreground">{t("league.inviteOnly")}</p>;
    }
    return (<Button onClick={() => requestMutation.mutate()} disabled={requestMutation.isPending}>
      {requestMutation.isPending ? t("league.sending") : t("league.requestJoin")}
    </Button>);
}
