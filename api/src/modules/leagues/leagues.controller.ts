import { LobbiesService } from "../lobbies/lobbies.service";
import { parseStringArray } from "../../utils/parseStringArray";
import { createLeagueSchema } from "./leagues.schemas";
import { LeaguesService } from "./leagues.service";
import { Request, Response } from "express";

export class LeaguesController {
  private readonly leaguesService = new LeaguesService();

  async list(request: Request, response: Response) {
    const membership = parseStringArray(request.query.membership);
    const visibility = request.query.visibility as string | undefined;
    const search = request.query.search as string | undefined;

    const leagues = await this.leaguesService.list({
      user_id: request.user.id,
      membership,
      visibility,
      search,
    });
    return response.json(leagues);
  }

  async create(request: Request, response: Response) {
    const body = createLeagueSchema.parse(request.body);

    const league = await this.leaguesService.create(request.user.id, {
      owner_id: request.user.id,
      ...body
    });

    return response.status(201).json(league);
  }

  async show(request: Request, response: Response) {
    const leagueId = request.params.id as string | undefined;
    const league = await this.leaguesService.show(leagueId);
    return response
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

  async remove(request: Request, response: Response) {
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