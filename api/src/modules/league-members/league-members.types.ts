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

export type LeagueMemberIdentity = {
  user_id?: string[];
  role?: string[];
  league_id?: string[];
  nickname?: string[];
};

export type CreateLeagueMemberDTO = {
  role: Exclude<LeagueMember['role'], 'owner'>;
};

export type UpdateLeagueMemberDTO = {
  role: LeagueMember['role'];
};
