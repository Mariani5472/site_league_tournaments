export type League = {
    id: string;
    ownerId: string;
    name: string;
    description?: string;
    visibility: "public" | "private";
    joinPolicy: "open" | "request" | "invite_only";
    lobbyCreationPolicy: "admins" | "members";
    autoStartLobby: boolean;
    playerCount?: number;
    maxPlayers: number;
    createdAt: Date;
};
export type ListLeaguesParams = {
    id?: string;
    userId?: string;
    visibility?: string;
    membership?: string[];
    search?: string;
};
export type CreateLeagueDTO = Pick<League, "ownerId" | "name" | "description" | "visibility" | "joinPolicy" | "maxPlayers"> & Partial<Pick<League, "lobbyCreationPolicy" | "autoStartLobby">>;
export type LeagueJoinRequest = {
    id: string;
    leagueId: string;
    userId: string;
    status: "pending" | "rejected" | "approved";
    createdAt: Date;
};
export type ListLeagueJoinRequestsParams = {
    status?: string[];
    search?: string;
    cursor?: string;
    limit: number;
};
export type LeagueJoinRequestsDTO = {
    leagueId: string;
    userId: string;
};
