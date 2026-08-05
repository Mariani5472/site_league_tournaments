export type LeagueMember = {
  id: string;
  user_id: string;
  nickname: string;
  avatar_url?: string | null;
  role: "owner" | "admin" | "player" | "spec";
  game_name?: string;
  tag_line?: string;
};
