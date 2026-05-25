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
    const league = await this.leaguesRepository.findById(
      params.leagueId
    );

    if (!league) {
      throw new Error("League not found");
    }

    const approverMember = await this.leaguesRepository.findMember({
      leagueId: params.leagueId,
      userId: params.rejecterId
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

    await this.leaguesRepository.rejectRequest(params.requestId);
  }
}