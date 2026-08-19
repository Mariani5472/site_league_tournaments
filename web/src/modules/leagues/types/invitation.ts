export type LeagueInvitation = {
    id: string;
    leagueId: string;
    recipientId: string;
    invitedBy: string;
    status: "pending" | "accepted" | "rejected" | "cancelled";
    leagueName: string;
    inviterNickname: string;
    createdAt: string;
};
