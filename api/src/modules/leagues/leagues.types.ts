export type CreateLeagueDTO = {
  ownerId: string;

  name: string;

  description?: string;

  visibility: "public" | "private";

  joinPolicy:
  | "open"
  | "request"
  | "invite_only";

  maxPlayers: number;
};