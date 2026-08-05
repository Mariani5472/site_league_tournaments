import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMatch, resolveMatch, voteMatch } from "./services";
import { toast } from "sonner";

export function MatchVoting({ matchId, canResolve }: { matchId: string; canResolve: boolean }) {
  const client = useQueryClient(); const [reason, setReason] = useState("");
  const match = useQuery({ queryKey: ["match", matchId], queryFn: () => getMatch(matchId), refetchInterval: 15000 });
  const refresh = () => { client.invalidateQueries({ queryKey: ["match", matchId] }); client.invalidateQueries({ queryKey: ["league-matches"] }); client.invalidateQueries({ queryKey: ["league-standings"] }); };
  const vote = useMutation({ mutationFn: (team: number) => voteMatch(matchId, team), onSuccess: refresh, onError: (e: Error) => toast.error(e.message) });
  const resolve = useMutation({ mutationFn: (team: number) => resolveMatch(matchId, team, reason), onSuccess: refresh, onError: (e: Error) => toast.error(e.message) });
  if (match.isLoading) return <p>Loading match...</p>; if (!match.data) return <p className="text-destructive">Match unavailable.</p>;
  const data = match.data; const needed1 = Math.max(0, (data.majority_required ?? 0) - (data.votes?.team_1 ?? 0)); const needed2 = Math.max(0, (data.majority_required ?? 0) - (data.votes?.team_2 ?? 0));
  return <section className="rounded-xl border p-4 sm:p-6 space-y-4"><h2 className="text-xl font-semibold">Match result</h2>{data.status === "finished" ? <p className="font-medium">Team {data.winner_team_number} won by {data.resolution_type === "admin" ? "administrative resolution" : "absolute majority"}.</p> : <><p className="text-sm text-muted-foreground">Absolute majority: {data.majority_required} votes. Team 1 needs {needed1}; Team 2 needs {needed2}.</p><div className="flex flex-wrap gap-2"><Button disabled={vote.isPending} onClick={() => vote.mutate(1)}>Vote Team 1</Button><Button disabled={vote.isPending} onClick={() => vote.mutate(2)}>Vote Team 2</Button></div>{canResolve && <div className="border-t pt-4 space-y-3"><p className="font-medium">Resolve a contested result</p><Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Required justification"/><div className="flex gap-2"><Button variant="outline" disabled={resolve.isPending || reason.trim().length < 5} onClick={() => resolve.mutate(1)}>Award Team 1</Button><Button variant="outline" disabled={resolve.isPending || reason.trim().length < 5} onClick={() => resolve.mutate(2)}>Award Team 2</Button></div></div>}</>}</section>;
}
