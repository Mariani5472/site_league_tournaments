export type DashboardData = {
    summary: { leagueCount: number; matchesPlayed: number; wins: number; losses: number };
    actions: Array<{
        id: string;
        type: "lobby_waiting" | "vote_pending" | "admin_requests";
        leagueId: string;
        leagueName: string;
        lobbyId: string | null;
        matchId: string | null;
        count: number | null;
        href: string;
    }>;
    recentLeagues: Array<{ id: string; name: string; description: string | null; playerCount: number; maxPlayers: number; role: string }>;
    recentMatches: Array<{ id: string; leagueId: string; leagueName: string; status: string; startedAt: string; finishedAt: string | null; winnerTeamNumber: number | null; teamNumber: number; result: "win" | "loss" | null }>;
};
