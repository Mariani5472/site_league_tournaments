export type LeagueInvitationStatus =
  "pending" | "accepted" | "rejected" | "cancelled";

export type LeagueInvitation = {
  id: string;
  leagueId: string;
  recipientId: string;
  invitedBy: string;
  status: LeagueInvitationStatus;
  createdAt: Date;
  updatedAt: Date;
  leagueName?: string;
  inviterNickname?: string;
};
