export type Profile = {
    id: string;
    email: string;
    nickname: string;
    avatarUrl: string | null;
    bannerUrl: string | null;
    createdAt: string;
    stats: { matchesPlayed: number; wins: number; losses: number };
    publicLeagues: Array<{
        id: string;
        name: string;
        description: string | null;
        playerCount: number;
        maxPlayers: number;
    }>;
    recentMatches: Array<{
        id: string;
        leagueId: string;
        leagueName: string;
        startedAt: string;
        finishedAt: string;
        teamNumber: number;
        result: "win" | "loss";
    }>;
};
export type PublicProfile = Omit<Profile, "email">;
export type PlayerSearchResult = {
    id: string;
    nickname: string;
    avatarUrl: string | null;
    publicLeagues: string[];
    commonPublicLeagueCount: number;
};
