export const queryKeys = {
    dashboard: ["dashboard"] as const,
    profile: {
        me: ["profile", "me"] as const,
        player: (userId: string) => ["profile", "player", userId] as const,
        discover: (search: string) => ["profile", "discover", search] as const,
    },
    riot: {
        config: ["riot", "config"] as const,
        me: ["riot", "me"] as const,
        account: (gameName: string, tagLine: string) =>
            ["riot", "account", gameName, tagLine] as const,
    },
    leagues: {
        all: ["leagues"] as const,
        discoverAll: ["leagues", "discover"] as const,
        discover: (search = "") => ["leagues", "discover", search] as const,
        mine: ["leagues", "mine"] as const,
        detail: (leagueId: string) => ["leagues", "detail", leagueId] as const,
        members: (leagueId: string) => ["leagues", "members", leagueId] as const,
        lobbies: (leagueId: string) => ["leagues", "lobbies", leagueId] as const,
        requests: (leagueId: string) => ["leagues", "requests", leagueId] as const,
        invitations: ["league-invitations"] as const,
        matches: (leagueId: string) => ["leagues", "matches", leagueId] as const,
        standings: (leagueId: string) => ["leagues", "standings", leagueId] as const,
    },
    lobbies: {
        detail: (leagueId: string, lobbyId: string) =>
            ["lobbies", "detail", leagueId, lobbyId] as const,
    },
    matches: {
        all: ["matches"] as const,
        detail: (matchId: string) => ["matches", "detail", matchId] as const,
    },
};
