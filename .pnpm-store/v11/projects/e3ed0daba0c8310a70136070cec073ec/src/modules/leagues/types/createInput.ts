export type CreateLeagueInput = {
  name: string;
  description: string;
  visibility: "public" | "private";
  join_policy:
  | "open"
  | "request"
  | "invite_only";
  max_players: number;
  require_riot_account: boolean;
};