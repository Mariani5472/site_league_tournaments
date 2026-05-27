import { createLeagueSchema } from "./leagues.schemas";
import { LeaguesService } from "./leagues.service";
import { Request, Response } from "express";

export class LeaguesController {
  private leaguesService = new LeaguesService();

  async my(request: Request, response: Response) {
    const leagues = await this.leaguesService.listUserLeagues(request.user.id);
    return response
      .json(leagues);
  }

  async public(request: Request, response: Response) {
    const leagues = await this.leaguesService.listPublicLeagues();
    return response
      .json(leagues);
  }

  async show(request: Request, response: Response) {
    const leagueId = request.params.id as string;
    const league = await this.leaguesService.show(leagueId);
    return response
      .json(league);
  }

  async members(request: Request, response: Response) {
    const leagueId = request.params.id as string;
    const members = await this.leaguesService.members(leagueId);
    return response
      .json(members);
  }

  async requests(request: Request, response: Response) {
    const leagueId = request.params.id as string;
    const leagues = await this.leaguesService.listPendingRequests(leagueId);
    return response
      .json(leagues);
  }

  async create(request: Request, response: Response) {
    const body = createLeagueSchema.parse(request.body);

    const league = await this.leaguesService.createLeague({
      ownerId: request.user.id,
      ...body
    });

    return response
      .status(201)
      .json(league);
  }

  async join(request: Request, response: Response) {
    const leagueId = request.params.id as string;

    await this.leaguesService.joinLeague({
      leagueId,
      userId: request.user.id
    });

    return response.status(204).send();
  }

  async requestJoin(request: Request, response: Response) {
    const leagueId = request.params.id as string;
    const userId = request.user.id;

    await this.leaguesService.requestJoin({
      leagueId,
      userId
    });

    return response
      .status(201)
      .send();
  }

  async approveRequest(request: Request, response: Response) {
    const leagueId = request.params.id as string;
    const requestId = request.params.requestId as string;
    const approverId = request.user.id;

    await this.leaguesService.approveJoinRequest({
      leagueId,
      requestId,
      approverId
    });

    return response
      .status(204)
      .send();
  }

  async rejectRequest(request: Request, response: Response) {
    const leagueId = request.params.id as string;
    const requestId = request.params.requestId as string;
    const rejecterId = request.user.id;

    await this.leaguesService.rejectJoinRequest({
      leagueId,
      requestId,
      rejecterId
    });

    return response
      .status(204)
      .send();
  }

  async updateMemberRole(request: Request, response: Response) {
    const leagueId = request.params.id as string;
    const memberId = request.params.memberId as string;
    const actorId = request.user.id;
    const { role } = request.body;

    await this.leaguesService.updateMemberRole({
      leagueId,
      memberId,
      actorId,
      role
    });

    return response
      .status(204)
      .send();
  }

  async kickMember(request: Request, response: Response) {
    const leagueId = request.params.id as string;
    const memberId = request.params.memberId as string;
    const actorId = request.user.id;

    await this.leaguesService.kickMember({
      leagueId,
      memberId,
      actorId
    });

    return response
      .status(204)
      .send();
  }

  async leave(request: Request, response: Response) {
    const leagueId = request.params.id as string;
    const userId = request.user.id;

    await this.leaguesService.leaveLeague({
      leagueId,
      userId
    });

    return response
      .status(204)
      .send();
  }

  async update(request: Request, response: Response) {
    const leagueId = request.params.id as string;
    const actorId = request.user.id;

    await this.leaguesService.updateLeague({
      leagueId,
      actorId,
      ...request.body
    });

    return response
      .status(204)
      .send();
  }

  async delete(request: Request, response: Response) {
    const leagueId = request.params.id as string;
    const actorId = request.user.id;

    await this.leaguesService.deleteLeague({
      leagueId,
      actorId
    });

    return response
      .status(204)
      .send();
  }
}