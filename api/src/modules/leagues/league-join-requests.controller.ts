import { Request, Response } from "express";
import { LeagueJoinRequestsService } from "./league-join-requests.service";
import { parseStringArray } from "../../utils/parseStringArray";

export class LeagueJoinRequestsController {
  private readonly leagueJoinRequestsService
    = new LeagueJoinRequestsService();

  async list(request: Request, response: Response) {
    const league_id = request.params.leagueId as string;
    const status = parseStringArray(request.query.status);
    const search = request.query.search as string | undefined;

    const requests = await this.leagueJoinRequestsService.list(request.user.id, {
      league_id: leagueId,
      status,
      search
    });

    return response.json(requests);
  }
}