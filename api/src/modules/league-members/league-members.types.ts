export type LeagueMember = {
    id: string;
    leagueId: string;
    userId: string;
    role: "owner" | "player" | "admin" | "spec";
    createdAt: Date;
    nickname?: string;
    gameName?: string;
    tagLine?: string;
};
export type LeagueMemberIdentity = {
    userId?: string[];
    role?: string[];
    leagueId?: string[];
    nickname?: string[];
    cursor?: string;
    limit: number;
};
export type CreateLeagueMemberDTO = {
    role: Exclude<LeagueMember['role'], 'owner'>;
};
export type UpdateLeagueMemberDTO = {
    role: LeagueMember['role'];
};
