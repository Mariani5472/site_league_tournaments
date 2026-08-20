import type { CursorPage } from "@/types/pagination";

export type OpsSession = { role: "super_admin" };
export type OpsUserSummary = {
    id: string;
    nickname: string;
    avatarUrl: string | null;
    createdAt: string;
    isSuperAdmin: boolean;
    membershipCount: number;
};
export type OpsLeagueSummary = {
    id: string;
    name: string;
    visibility: "public" | "private";
    joinPolicy: string;
    maxPlayers: number;
    ownerId: string;
    ownerNickname: string;
    memberCount: number;
    operationalStatus: "active" | "idle";
};
export type OpsUserDetail = OpsUserSummary & {
    email: string;
    accountStatus: "active";
    platformRoles: string[];
    pendingRequestCount: number;
    pendingInvitationCount: number;
    activeLobby: null | { id: string; leagueId: string; leagueName: string; status: string };
    memberships: Array<{
        leagueId: string;
        leagueName: string;
        visibility: string;
        role: string;
        joinedAt: string;
    }>;
    recentMatches: Array<{
        id: string;
        leagueId: string;
        leagueName: string;
        status: string;
        result: string | null;
        finishedAt: string | null;
    }>;
};
export type OpsLeagueDetail = OpsLeagueSummary & {
    description: string | null;
    lobbyCreationPolicy: string;
    autoStartLobby: boolean;
    activeLobbyCount: number;
    activeMatchCount: number;
    members: Array<{ userId: string; nickname: string; role: string; joinedAt: string }>;
    recentLobbies: Array<{ id: string; status: string; createdAt: string }>;
    recentMatches: Array<{ id: string; status: string; createdAt: string }>;
};
export type OpsUsersPage = CursorPage<OpsUserSummary>;
export type OpsLeaguesPage = CursorPage<OpsLeagueSummary>;
