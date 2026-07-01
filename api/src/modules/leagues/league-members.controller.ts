import { Request, Response } from "express";

export class LeagueMembersController {
  async list(request: Request, response: Response) {
    const leagueId = request.params.id as string | undefined;
    const members = await this.leagueJoinRequestsService.list(leagueId);

    return response.json(members);
  }
}