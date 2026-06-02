export type League = {
  id: string;
  name: string;
  description: string | null;
  visibility: "public" | "private";
  join_policy: "open" | "request" | "invite_only";
  require_riot_account: boolean;
  max_players: number;
  created_at: string;
};