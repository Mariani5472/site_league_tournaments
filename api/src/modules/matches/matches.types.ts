export type MatchStatus = "in_game" | "finished" | "cancelled";
export type MatchDetails = {
    id: string;
    leagueId: string;
    lobbyId: string;
    status: MatchStatus;
    winnerTeamNumber: number | null;
    resolutionType: "vote" | "admin" | null;
    resolutionReason: string | null;
    startedAt: Date;
    finishedAt: Date | null;
};
