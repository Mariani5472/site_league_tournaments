export type MatchPlayer = { user_id: string; nickname: string; team_number: 1 | 2; result: "win" | "loss" | null };
export type Match = {
  id: string; league_id: string; lobby_id: string; status: "in_game" | "finished" | "cancelled";
  winner_team_number: 1 | 2 | null; resolution_type: "vote" | "admin" | null;
  resolution_reason: string | null; started_at: string; finished_at: string | null;
  players: MatchPlayer[]; vote_count?: number;
  votes?: { team_1: number; team_2: number; total: number }; majority_required?: number;
};
export type Standing = { position: number; user_id: string; nickname: string; avatar_url?: string; games_played: number; wins: number; losses: number; win_rate: number };
