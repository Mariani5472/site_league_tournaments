export type League = {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  visibility: "public" | "private";
  join_policy: "open" | "request" | "invite_only";
  max_players: number;
  require_riot_account: boolean;
  created_at: Date;
};

export type CreateLeagueDTO = Pick<
  League,
  | "owner_id"
  | "name"
  | "description"
  | "visibility"
  | "join_policy"
  | "max_players"
  | "require_riot_account"
>;

export type ListLeaguesParams = {
  id?: string,
  user_id?: string,
  visibility?: string,
  membership?: string[],
  search?: string,
}

export type LeagueJoinRequestsParams = {
  league_id: string,
  status?: string[],
  search?: string,
}