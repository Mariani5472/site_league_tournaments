export type League = {
    id: string;
    name: string;
    description: string | null;
    visibility: "public" | "private";
    joinPolicy: "open" | "request" | "invite_only";
    playerCount: number;
    maxPlayers: number;
    createdAt: string;
};
