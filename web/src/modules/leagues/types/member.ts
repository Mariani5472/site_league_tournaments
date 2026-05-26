export type LeagueMember = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  role: "owner" | "admin" | "player" | "spec";
};