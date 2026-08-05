import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Dices, RefreshCw, Scale, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/queryKeys";
import { confirmTeamSelection, draftPick, finalizeCaptains, voteCaptain, voteTeamSelection } from "../services/lobbies.service";
import type { LobbyDetails, TeamSelectionMode } from "../types/lobby.types";

const options: Array<{ mode: TeamSelectionMode; title: string; description: string; icon: typeof Dices }> = [
  { mode: "random", title: "Aleatório", description: "Embaralha os dez jogadores e permite reroll por consenso.", icon: Dices },
  { mode: "balanced", title: "Balanceado", description: "Minimiza a diferença usando o histórico da liga.", icon: Scale },
  { mode: "player_picks", title: "Player picks", description: "Os dois mais votados viram capitães e fazem o draft.", icon: UsersRound },
];

export function TeamSelection({ lobby }: { lobby: LobbyDetails }) {
  const selection = lobby.team_selection; const client = useQueryClient();
  const [seconds, setSeconds] = useState(60);
  const refresh = () => client.invalidateQueries({ queryKey: queryKeys.lobbies.detail(lobby.league_id, lobby.id) });
  const mutationOptions = { onSuccess: refresh, onError: (error: Error) => toast.error(error.message) };
  const vote = useMutation({ mutationFn: (mode: TeamSelectionMode) => voteTeamSelection(lobby.league_id, lobby.id, mode), ...mutationOptions });
  const confirm = useMutation({ mutationFn: (decision: "accept" | "reroll") => confirmTeamSelection(lobby.league_id, lobby.id, decision), ...mutationOptions });
  const captainVote = useMutation({ mutationFn: (id: string) => voteCaptain(lobby.league_id, lobby.id, id), ...mutationOptions });
  const finalize = useMutation({ mutationFn: () => finalizeCaptains(lobby.league_id, lobby.id), ...mutationOptions });
  const pick = useMutation({ mutationFn: (id: string) => draftPick(lobby.league_id, lobby.id, id), ...mutationOptions });
  const endsAt = selection?.captain_vote?.ends_at ? new Date(selection.captain_vote.ends_at).getTime() : null;
  useEffect(() => { if (!endsAt) return; const tick = () => setSeconds(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))); tick(); const timer = window.setInterval(tick, 1000); return () => window.clearInterval(timer); }, [endsAt]);
  useEffect(() => { if (endsAt && seconds === 0 && !finalize.isPending) finalize.mutate(); }, [endsAt, seconds]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!selection?.available && !selection?.mode) return null;
  if (selection.completed) return <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5"><h2 className="font-semibold text-emerald-700">Times definidos</h2><p className="mt-1 text-sm text-muted-foreground">Modo: {options.find(option => option.mode === selection.mode)?.title}. A partida já pode ser iniciada quando todos estiverem prontos.</p></section>;

  if (selection.mode === "random" && selection.confirmation) return <section className="rounded-2xl border bg-card p-5 shadow-sm"><h2 className="text-xl font-semibold">Sorteio #{selection.round}: os times ficaram bons?</h2><p className="mt-1 text-sm text-muted-foreground">São necessários {selection.majority_required} votos iguais. Você pode mudar seu voto enquanto não houver maioria.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Button size="lg" variant={selection.confirmation.my_vote === "accept" ? "default" : "outline"} disabled={!selection.can_vote || confirm.isPending} onClick={() => confirm.mutate("accept")}><Check className="mr-2 h-4 w-4"/>Aprovar times ({selection.confirmation.votes.accept}/{selection.majority_required})</Button><Button size="lg" variant={selection.confirmation.my_vote === "reroll" ? "destructive" : "outline"} disabled={!selection.can_vote || confirm.isPending} onClick={() => confirm.mutate("reroll")}><RefreshCw className="mr-2 h-4 w-4"/>Sortear novamente ({selection.confirmation.votes.reroll}/{selection.majority_required})</Button></div></section>;

  if (selection.mode === "player_picks" && selection.captain_vote) return <section className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-semibold">Vote nos capitães</h2><p className="mt-1 text-sm text-muted-foreground">Os dois mais votados serão os capitães. Em caso de empate, o desempate é aleatório.</p></div><strong className="rounded-full bg-primary/10 px-4 py-2 text-primary">{seconds}s</strong></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{selection.captain_vote.candidates.map(candidate => <Button key={candidate.user_id} variant={selection.captain_vote?.my_vote === candidate.user_id ? "default" : "outline"} disabled={!selection.can_vote || captainVote.isPending || seconds === 0} onClick={() => captainVote.mutate(candidate.user_id)} className="h-auto justify-between py-3"><span className="truncate">{candidate.nickname}</span><strong>{candidate.votes}</strong></Button>)}</div>{seconds === 0 && <p className="mt-3 text-sm text-muted-foreground">Apurando os votos...</p>}</section>;

  if (selection.mode === "player_picks" && selection.draft) { const myId = lobby.current_player?.user_id; const myTeam = myId === selection.draft.captain_1 ? 1 : myId === selection.draft.captain_2 ? 2 : null; return <section className="rounded-2xl border bg-card p-5 shadow-sm"><h2 className="text-xl font-semibold">Player picks</h2><p className="mt-1 text-sm text-muted-foreground">Vez do capitão do Time {selection.draft.next_team}. Ordem: 1 escolha, 2 escolhas, 2 escolhas, 2 escolhas e 1 escolha.</p><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{selection.draft.available_players.map(player => <Button key={player.user_id} variant="outline" disabled={pick.isPending || myTeam !== selection.draft?.next_team} onClick={() => pick.mutate(player.user_id)}>{player.nickname}</Button>)}</div>{!myTeam && <p className="mt-3 text-sm text-muted-foreground">Acompanhe as escolhas dos capitães em tempo real.</p>}</section>; }

  return <section className="rounded-2xl border bg-card p-5 shadow-sm"><h2 className="text-xl font-semibold">Como os times serão formados?</h2><p className="mt-1 text-sm text-muted-foreground">A primeira opção a receber {selection.majority_required} votos vence. Você pode alterar seu voto.</p><div className="mt-5 grid gap-3 md:grid-cols-3">{options.map(({mode,title,description,icon:Icon}) => <button key={mode} disabled={vote.isPending || !selection.can_vote} onClick={() => vote.mutate(mode)} className={`rounded-xl border p-4 text-left transition-all hover:border-primary/40 disabled:opacity-60 ${selection.my_vote === mode ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "bg-background"}`}><span className="flex items-center justify-between"><Icon className="h-5 w-5 text-primary"/><strong>{selection.votes[mode]}/{selection.majority_required}</strong></span><span className="mt-4 block font-semibold">{title}</span><span className="mt-1 block text-sm text-muted-foreground">{description}</span></button>)}</div></section>;
}
