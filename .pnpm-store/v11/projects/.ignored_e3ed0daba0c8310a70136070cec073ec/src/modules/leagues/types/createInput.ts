export type CreateLeagueInput = {
    name: string;
    description: string;
    visibility: "public" | "private";
    joinPolicy: "open" | "request" | "invite_only";
    maxPlayers: number;
};
