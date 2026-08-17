export type MatchPlayer = {
    userId: string;
    nickname: string;
    teamNumber: 1 | 2;
    result: "win" | "loss" | null;
};
export type Match = {
    id: string;
    leagueId: string;
    lobbyId: string;
    status: "in_game" | "finished" | "cancelled";
    winnerTeamNumber: 1 | 2 | null;
    resolutionType: "vote" | "admin" | null;
    resolutionReason: string | null;
    startedAt: string;
    finishedAt: string | null;
    players: MatchPlayer[];
    voteCount?: number;
    votes?: {
        team1: number;
        team2: number;
        total: number;
    };
    majorityRequired?: number;
};
export type Standing = {
    position: number;
    userId: string;
    nickname: string;
    avatarUrl?: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
    winRate: number;
};
