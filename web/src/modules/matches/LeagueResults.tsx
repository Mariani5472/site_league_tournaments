import { useQuery } from "@tanstack/react-query";
import { getMatches, getStandings } from "./services";

export function LeagueResults({ leagueId }: { leagueId: string }) {
  const matches = useQuery({ queryKey: ["league-matches", leagueId], queryFn: () => getMatches(leagueId) });
  const standings = useQuery({ queryKey: ["league-standings", leagueId], queryFn: () => getStandings(leagueId) });
  return <>
    <section className="rounded-xl border p-4 sm:p-6 space-y-4 overflow-hidden">
      <h2 className="text-xl font-semibold">Standings</h2>
      {standings.isLoading ? <p className="text-muted-foreground">Loading standings...</p> : standings.isError ? <p className="text-destructive">Could not load standings.</p> : standings.data?.length ? (
        <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-sm"><thead><tr className="text-left border-b"><th className="p-2">#</th><th>Player</th><th>Played</th><th>Wins</th><th>Losses</th><th>Win rate</th></tr></thead><tbody>{standings.data.map(row => <tr key={row.user_id} className="border-b last:border-0"><td className="p-2">{row.position}</td><td>{row.nickname}</td><td>{row.games_played}</td><td>{row.wins}</td><td>{row.losses}</td><td>{Math.round(row.win_rate * 100)}%</td></tr>)}</tbody></table></div>
      ) : <p className="text-muted-foreground">No ranked matches yet.</p>}
    </section>
    <section className="rounded-xl border p-4 sm:p-6 space-y-4">
      <h2 className="text-xl font-semibold">Match history</h2>
      {matches.isLoading ? <p className="text-muted-foreground">Loading matches...</p> : matches.isError ? <p className="text-destructive">Could not load match history.</p> : matches.data?.length ? <div className="space-y-3">{matches.data.map(match => <article key={match.id} className="rounded-lg border p-4 space-y-2"><div className="flex flex-wrap justify-between gap-2"><span className="font-medium">{new Date(match.started_at).toLocaleString()}</span><span className="text-sm capitalize">{match.status.replace("_", " ")}</span></div><div className="grid sm:grid-cols-2 gap-2 text-sm"><div><strong>Team 1</strong>: {match.players.filter(p => p.team_number === 1).map(p => p.nickname).join(", ")}</div><div><strong>Team 2</strong>: {match.players.filter(p => p.team_number === 2).map(p => p.nickname).join(", ")}</div></div><p className="text-sm text-muted-foreground">{match.winner_team_number ? `Winner: Team ${match.winner_team_number} · ${match.resolution_type === "admin" ? "Administrative resolution" : "Participant vote"} · ${match.vote_count ?? 0} votes` : `Voting open · ${match.vote_count ?? 0} votes`}</p>{match.resolution_reason && <p className="text-sm">Reason: {match.resolution_reason}</p>}</article>)}</div> : <p className="text-muted-foreground">No matches have been started.</p>}
    </section>
  </>;
}
