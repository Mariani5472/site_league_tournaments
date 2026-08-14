export type CreateLobbyDTO = {
    maxPlayers: number;
};
export type Lobby = {
    id: string;
    leagueId: string;
    status: string;
    maxPlayers: number;
    createdBy: string;
    createdAt: Date;
    teamSelectionMode: "random" | "balanced" | "player_picks" | null;
    teamSelectionCompleted: boolean;
    draftCaptain1: string | null;
    draftCaptain2: string | null;
    draftPickIndex: number;
    teamSelectionRound: number;
    captainVoteEndsAt: Date | null;
};
export type LobbyPlayer = {
    id: string;
    lobbyId: string;
    userId: string;
    teamNumber: number;
    isReady: boolean;
};
export type LobbyPlayerProfile = LobbyPlayer & {
    nickname: string;
    avatarUrl: string;
};
