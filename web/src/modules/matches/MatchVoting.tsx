import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMatch, resolveMatch, voteMatch } from "./services";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import { useSocketConnected } from "@/hooks/useSocketConnected";
export function MatchVoting({ matchId, canResolve }: {
    matchId: string;
    canResolve: boolean;
}) {
    const client = useQueryClient();
    const socketConnected = useSocketConnected();
    const [reason, setReason] = useState("");
    const match = useQuery({
        queryKey: queryKeys.matches.detail(matchId),
        queryFn: () => getMatch(matchId),
        refetchInterval: socketConnected ? false : 15_000,
        refetchOnWindowFocus: true,
    });
    const refresh = (updatedMatch: typeof match.data) => {
        client.invalidateQueries({ queryKey: queryKeys.matches.detail(matchId) });
        if (updatedMatch?.leagueId) {
            client.invalidateQueries({ queryKey: queryKeys.leagues.matches(updatedMatch.leagueId) });
            client.invalidateQueries({ queryKey: queryKeys.leagues.standings(updatedMatch.leagueId) });
        }
    };
    const vote = useMutation({ mutationFn: (team: number) => voteMatch(matchId, team), onSuccess: refresh, onError: (e: Error) => toast.error(e.message) });
    const resolve = useMutation({ mutationFn: (team: number) => resolveMatch(matchId, team, reason), onSuccess: refresh, onError: (e: Error) => toast.error(e.message) });
    if (match.isLoading)
        return <p className="text-muted-foreground">Carregando partida...</p>;
    if (match.isError || !match.data)
        return <p className="text-destructive" role="alert">Não foi possível carregar a partida.</p>;
    const data = match.data;
    const needed1 = Math.max(0, (data.majorityRequired ?? 0) - (data.votes?.team1 ?? 0));
    const needed2 = Math.max(0, (data.majorityRequired ?? 0) - (data.votes?.team2 ?? 0));
    return <section className="rounded-xl border p-4 sm:p-6 space-y-4"><h2 className="text-xl font-semibold">Match result</h2>{data.status === "finished" ? <p className="font-medium">Team {data.winnerTeamNumber} won by {data.resolutionType === "admin" ? "administrative resolution" : "absolute majority"}.</p> : <><p className="text-sm text-muted-foreground">Absolute majority: {data.majorityRequired} votes. Team 1 needs {needed1}; Team 2 needs {needed2}.</p><p className="font-medium">{data.myVote ? `Your current vote: Team ${data.myVote}` : "You have not voted yet."}</p><div className="flex flex-wrap gap-2"><Button variant={data.myVote === 1 ? "default" : "outline"} aria-pressed={data.myVote === 1} disabled={vote.isPending} onClick={() => vote.mutate(1)}>Vote Team 1</Button><Button variant={data.myVote === 2 ? "default" : "outline"} aria-pressed={data.myVote === 2} disabled={vote.isPending} onClick={() => vote.mutate(2)}>Vote Team 2</Button></div>{canResolve && <div className="border-t pt-4 space-y-3"><p className="font-medium">Resolve a contested result</p><Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Required justification"/><div className="flex gap-2"><Button variant="outline" disabled={resolve.isPending || reason.trim().length < 5} onClick={() => resolve.mutate(1)}>Award Team 1</Button><Button variant="outline" disabled={resolve.isPending || reason.trim().length < 5} onClick={() => resolve.mutate(2)}>Award Team 2</Button></div></div>}</>}</section>;
}
