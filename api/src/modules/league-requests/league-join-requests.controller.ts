import { Request, Response } from "express";
import { LeagueJoinRequestsService } from "./league-join-requests.service";
import { parseStringArray } from "../../utils/parseStringArray";
import { updateJoinRequestSchema } from "../leagues/leagues.schemas";

export class LeagueJoinRequestsController {
  private readonly leagueJoinRequestsService
    = new LeagueJoinRequestsService();

  async list(request: Request, response: Response) {
    const requester_id = request.user.id;
    const league_id = request.params.league_id as string;
    const status = parseStringArray(request.query.status);
    const search = request.query.search as string | undefined;

    const requests = await this.leagueJoinRequestsService.list(requester_id, league_id, {
      status,
      search
    });

    return response.json(requests);
  }

  async create(request: Request, response: Response) {
    const league_id = request.params.league_id as string;
    const user_id = request.user.id;

    const joinRequest = await this.leagueJoinRequestsService.create(user_id, league_id);

    return response.status(201).json(joinRequest);
  }

  async update(request: Request, response: Response) {
    const league_id = request.params.league_id as string;
    const request_id = request.params.request_id as string;
    const requester_id = request.user.id;
    const params = updateJoinRequestSchema.parse(request.body);

    const joinRequest = await this.leagueJoinRequestsService.update(
      league_id,
      request_id,
      requester_id,
      params
    );

    return response.status(200).json(joinRequest);
  }

  async remove(request: Request, response: Response) {
    const league_id = request.params.league_id as string;
    const request_id = request.params.request_id as string;
    const requester_id = request.user.id;

    await this.leagueJoinRequestsService.remove(
      league_id,
      request_id,
      requester_id
    );

    return response.status(204).send();
  }
}
