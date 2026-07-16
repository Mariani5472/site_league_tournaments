export type League = {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  visibility: "public" | "private";
  join_policy: "open" | "request" | "invite_only";
  player_count?: number;
  max_players: number;
  require_riot_account: boolean;
  created_at: Date;
};

export type ListLeaguesParams = {
  id?: string,
  user_id?: string,
  visibility?: string,
  membership?: string[],
  search?: string,
}

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

export type LeagueJoinRequest = {
  id: string;
  league_id: string;
  user_id: string;
  status: | "pending" | "rejected" | "approved";
  created_at: Date;
};

export type ListLeagueJoinRequestsParams = {
  status?: string[],
  search?: string,
}

export type LeagueJoinRequestsDTO = {
  league_id: string,
  user_id: string,
}

export type LeagueMember = {
  id: string;
  league_id: string;
  user_id: string;
  role: "owner" | "player" | "admin" | "spec";
  created_at: Date;
  nickname?: string;
  game_name?: string;
  tag_line?: string;
};

export type ListLeagueMembersParams = {
  user_id?: string[];
  nickname?: string[],
  role?: string[]
}

export type CreateLeagueMemberDTO = {
  role: | "player" | "admin" | "spec" | "owner"
}