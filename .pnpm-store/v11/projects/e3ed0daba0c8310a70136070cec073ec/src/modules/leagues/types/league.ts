export type League = {
  id: string;
  name: string;
  description: string | null;
  visibility: "public" | "private";
  join_policy: "open" | "request" | "invite_only";
  require_riot_account: boolean;
  player_count: number;
  max_players: number;
  created_at: string;
};