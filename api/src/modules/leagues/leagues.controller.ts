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
    const leagues = await this.leaguesService.listPublicLeagues();
    return response
      .json(leagues);
  }

  async members(request: Request, response: Response) {
    const leagues = await this.leaguesService.listPublicLeagues();
    return response
      .json(leagues);
  }

  async requests(request: Request, response: Response) {
    const leagues = await this.leaguesService.listPublicLeagues();
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
    const leagueId = request.params.id[0] ?? request.params.id;

    await this.leaguesService.joinLeague({
      leagueId,
      userId: request.user.id
    });

    return response.status(204).send();
  }

  async requestJoin(request: Request, response: Response) {
    const leagueId = request.params.id[0] ?? request.params.id;

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
    const leagueId = request.params.id[0] ?? request.params.id;
    const requestId = request.params.requestId[0] ?? request.params.requestId;
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
    const leagueId = request.params.id[0] ?? request.params.id;
    const requestId = request.params.requestId[0] ?? request.params.requestId;
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

}