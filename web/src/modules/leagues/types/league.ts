export type League = {
    id: string;
    name: string;
    description: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    visibility: "public" | "private";
    joinPolicy: "open" | "request" | "invite_only";
    lobbyCreationPolicy: "admins" | "members";
    autoStartLobby: boolean;
    playerCount: number;
    maxPlayers: number;
    createdAt: string;
    currentUserRole: "owner" | "admin" | "player" | "spec" | null;
};
