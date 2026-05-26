import { LeaguesRepository } from "./leagues.repository";
import { CreateLeagueDTO } from "./leagues.types";

export class LeaguesService {
  private leaguesRepository = new LeaguesRepository();

  async createLeague(data: CreateLeagueDTO) {
    const league = await this.leaguesRepository.create(data);

    await this.leaguesRepository.addMember({
      leagueId: league.id,
      userId: data.ownerId,
      role: "owner"
    });

    return league;
  }

  async listUserLeagues(userId: string) {
    return await this.leaguesRepository.listUserLeagues(userId);
  }

  async show(leagueId: string) {
    return await this.leaguesRepository.findById(leagueId);
  }

  async members(leagueId: string) {
    return await this.leaguesRepository.listLeagueMembers(leagueId);
  }

  async listPendingRequests(leagueId: string) {
    return await this.leaguesRepository.listLeaguePendingRequests(leagueId);
  }

  async listPublicLeagues() {
    return await this.leaguesRepository.listPublic();
  }

  async joinLeague(params: {
    leagueId: string;
    userId: string;
  }) {
    const league = await this.leaguesRepository.findById(params.leagueId);
    if (!league) {
      throw new Error("League not found");
    }

    const existingMember = await this.leaguesRepository.findMember({
      leagueId: params.leagueId,
      userId: params.userId
    });

    if (existingMember) {
      throw new Error("User already joined");
    }

    const totalPlayers = await this.leaguesRepository.countPlayers(params.leagueId);

    if (totalPlayers >= league.max_players) {
      throw new Error("League is full");
    }

    if (league.join_policy === "open") {
      await this.leaguesRepository.addMember({
        leagueId: params.leagueId,
        userId: params.userId,
        role: "player"
      });

      return;
    }

    throw new Error("League is invite only");
  }

  async requestJoin(params: {
    leagueId: string;
    userId: string;
  }) {
    const league = await this.leaguesRepository.findById(params.leagueId);
    if (!league) {
      throw new Error("League not found");
    }

    if (league.join_policy !== "request") {
      throw new Error("League does not accept requests");
    }

    const existingMember = await this.leaguesRepository.findMember({
      leagueId: params.leagueId,
      userId: params.userId
    });

    if (existingMember) {
      throw new Error("User already joined");
    }

    const existingRequest = await this.leaguesRepository.findJoinRequest({
      leagueId: params.leagueId,
      userId: params.userId
    });

    if (existingRequest) {
      throw new Error("Request already exists");
    }

    await this.leaguesRepository.createJoinRequest({
      leagueId: params.leagueId,
      userId: params.userId
    });
  }

  async approveJoinRequest(params: {
    leagueId: string;
    requestId: string;
    approverId: string;
  }) {
    const league = await this.leaguesRepository.findById(
      params.leagueId
    );

    if (!league) {
      throw new Error("League not found");
    }

    const approverMember = await this.leaguesRepository.findMember({
      leagueId: params.leagueId,
      userId: params.approverId
    });

    if (!approverMember) {
      throw new Error("Not a league member");
    }

    const allowedRoles = ["owner", "admin"];

    if (!allowedRoles.includes(approverMember.role)) {
      throw new Error("Insufficient permissions");
    }

    const joinRequest = await this.leaguesRepository.findRequestById(params.requestId);

    if (!joinRequest) {
      throw new Error("Request not found");
    }

    if (joinRequest.league_id !== params.leagueId) {
      throw new Error("Request does not belong to league");
    }

    if (joinRequest.status !== "pending") {
      throw new Error("Request already processed");
    }

    const totalPlayers = await this.leaguesRepository.countPlayers(params.leagueId);

    if (totalPlayers >= league.max_players) {
      throw new Error("League is full");
    }

    await this.leaguesRepository.addMember({
      leagueId: params.leagueId,
      userId: joinRequest.user_id,
      role: "player"
    });

    await this.leaguesRepository.approveRequest(params.requestId);
  }

  async rejectJoinRequest(params: {
    leagueId: string;
    requestId: string;
    rejecterId: string;
  }) {
    const league = await this.leaguesRepository.findById(params.leagueId);

    if (!league) {
      throw new Error("League not found");
    }

    const actorMember = await this.leaguesRepository.findMember({
      leagueId: params.leagueId,
      userId: params.rejecterId
    });

    if (!actorMember) {
      throw new Error("Not a league member");
    }

    const allowedRoles = ["owner", "admin"];

    if (!allowedRoles.includes(actorMember.role)) {
      throw new Error("Insufficient permissions");
    }

    const joinRequest = await this.leaguesRepository.findRequestById(params.requestId);

    if (!joinRequest) {
      throw new Error("Request not found");
    }

    if (joinRequest.league_id !== params.leagueId) {
      throw new Error("Request does not belong to league");
    }

    if (joinRequest.status !== "pending") {
      throw new Error("Request already processed");
    }

    await this.leaguesRepository.rejectRequest(params.requestId);
  }

  async updateMemberRole(params: {
    leagueId: string;
    memberId: string;
    actorId: string;
    role: string;
  }) {
    const allowedRoles = ["admin", "player", "spec"];

    if (!allowedRoles.includes(params.role)) {
      throw new Error("Invalid role");
    }

    const actorMember = await this.leaguesRepository.findMember({
      leagueId: params.leagueId,
      userId: params.actorId
    });

    if (!actorMember) {
      throw new Error("Not a league member");
    }

    if (actorMember.role !== "owner") {
      throw new Error("Only owner can update roles");
    }

    const targetMember = await this.leaguesRepository.findMember({
      leagueId: params.leagueId,
      userId: params.memberId
    });

    if (!targetMember) {
      throw new Error("Member not found");
    }

    if (targetMember.role === "owner") {
      throw new Error("Cannot update owner role");
    }

    await this.leaguesRepository.updateMemberRole({
      leagueId: params.leagueId,
      userId: params.memberId,
      role: params.role
    });
  }

  async kickMember(params: {
    leagueId: string;
    memberId: string;
    actorId: string;
  }) {
    const actorMember = await this.leaguesRepository.findMember({
      leagueId: params.leagueId,
      userId: params.actorId
    });

    if (!actorMember) {
      throw new Error("Not a league member");
    }

    const targetMember = await this.leaguesRepository.findMember({
      leagueId: params.leagueId,
      userId: params.memberId
    });

    if (!targetMember) {
      throw new Error("Member not found");
    }

    const allowedRoles = ["owner", "admin"];

    if (!allowedRoles.includes(actorMember.role)) {
      throw new Error("Insufficient permissions");
    }

    if (targetMember.role === "owner") {
      throw new Error("Cannot kick owner");
    }

    if (actorMember.role === "admin" && targetMember.role === "admin") {
      throw new Error("Admin cannot kick another admin");
    }

    await this.leaguesRepository.removeMember({
      leagueId: params.leagueId,
      userId: params.memberId
    });
  }

  async leaveLeague(params: {
    leagueId: string;
    userId: string;
  }) {
    const member = await this.leaguesRepository.findMember({
      leagueId: params.leagueId,
      userId: params.userId
    });

    if (!member) {
      throw new Error("Not a league member");
    }

    if (member.role === "owner") {
      throw new Error("Owner cannot leave league");
    }

    await this.leaguesRepository.removeMember({
      leagueId: params.leagueId,
      userId: params.userId
    });
  }

  async updateLeague(params: {
    leagueId: string;
    actorId: string;
    name?: string;
    description?: string;
    maxPlayers?: number;
  }) {
    const member = await this.leaguesRepository.findMember({
      leagueId: params.leagueId,
      userId: params.actorId
    });

    if (!member) {
      throw new Error("Not a league member");
    }

    const allowedRoles = ["owner", "admin"];

    if (!allowedRoles.includes(member.role)) {
      throw new Error("Insufficient permissions");
    }

    await this.leaguesRepository.updateLeague(params);
  }

  async deleteLeague(params: {
    leagueId: string;
    actorId: string;
  }) {
    const member = await this.leaguesRepository.findMember({
      leagueId: params.leagueId,
      userId: params.actorId
    });

    if (!member) {
      throw new Error("Not a league member");
    }

    if (member.role !== "owner") {
      throw new Error("Only owner can delete league");
    }

    await this.leaguesRepository.deleteLeague(params.leagueId);
  }
}