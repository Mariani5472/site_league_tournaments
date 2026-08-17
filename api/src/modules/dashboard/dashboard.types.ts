export type DashboardAction = {
    id: string;
    type: "lobby_waiting" | "vote_pending" | "admin_requests";
    leagueId: string;
    leagueName: string;
    lobbyId: string | null;
    matchId: string | null;
    count: number | null;
    href: string;
};

export type DashboardActionRow = Omit<DashboardAction, "href"> & {
    priority: number;
    occurredAt: Date;
};

export type DashboardResponse = {
    summary: { leagueCount: number; matchesPlayed: number; wins: number; losses: number };
    actions: DashboardAction[];
    recentLeagues: Array<{ id: string; name: string; description: string | null; playerCount: number; maxPlayers: number; role: string }>;
    recentMatches: Array<{ id: string; leagueId: string; leagueName: string; status: string; startedAt: Date; finishedAt: Date | null; winnerTeamNumber: number | null; teamNumber: number; result: string | null }>;
};
