export type LeagueMember = {
    id: string;
    userId: string;
    nickname: string;
    avatarUrl?: string | null;
    role: "owner" | "admin" | "player" | "spec";
    gameName?: string;
    tagLine?: string;
};
