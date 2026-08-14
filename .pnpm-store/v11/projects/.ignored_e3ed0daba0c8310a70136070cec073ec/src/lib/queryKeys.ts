export const queryKeys = {
    profile: {
        me: ["profile", "me"] as const,
    },
    riot: {
        config: ["riot", "config"] as const,
        me: ["riot", "me"] as const,
        account: (gameName: string, tagLine: string) => ["riot", "account", gameName, tagLine] as const,
    },
    leagues: {
        all: ["leagues"] as const,
        discover: (search = "") => ["leagues", "discover", search] as const,
        mine: ["leagues", "mine"] as const,
        detail: (leagueId: string) => ["leagues", "detail", leagueId] as const,
        members: (leagueId: string) => ["leagues", "members", leagueId] as const,
        lobbies: (leagueId: string) => ["leagues", "lobbies", leagueId] as const,
        requests: (leagueId: string) => ["leagues", "requests", leagueId] as const,
        matches: (leagueId: string) => ["leagues", "matches", leagueId] as const,
        standings: (leagueId: string) => ["leagues", "standings", leagueId] as const,
    },
    lobbies: {
        detail: (leagueId: string, lobbyId: string) => ["lobbies", "detail", leagueId, lobbyId] as const,
    },
    matches: {
        detail: (matchId: string) => ["matches", "detail", matchId] as const,
    },
};
