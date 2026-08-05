export type MatchStatus = "in_game" | "finished" | "cancelled";

export type MatchDetails = {
  id: string;
  league_id: string;
  lobby_id: string;
  status: MatchStatus;
  winner_team_number: number | null;
  resolution_type: "vote" | "admin" | null;
  resolution_reason: string | null;
  started_at: Date;
  finished_at: Date | null;
};
