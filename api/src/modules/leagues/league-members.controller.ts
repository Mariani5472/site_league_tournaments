import { Request, Response } from "express";
import { LeagueMembersService } from "./league-members.service";
import { parseStringArray } from "../../utils/parseStringArray";
import { createLeagueMemberSchema } from "./leagues.schemas";

export class LeagueMembersController {
  private readonly leagueMembersService
    = new LeagueMembersService();

  async list(request: Request, response: Response) {
    const league_id = request.params.league_id as string | undefined;
    const nickname = parseStringArray(request.query.nickname);
    const role = parseStringArray(request.query.role);

    const members = await this.leagueMembersService.list(league_id, {
      nickname,
      role
    });

    return response.json(members);
  }

  async create(request: Request, response: Response) {
    const requester_id = request.user.id
    const league_id = request.params.league_id as string | undefined;
    const user_id = request.params.user_id as string | undefined;
    const body = createLeagueMemberSchema.parse(request.body);

    const member = await this.leagueMembersService.create(
      requester_id,
      league_id,
      user_id,
      body
    );

    return response.json(member);
  }

  async update(request: Request, response: Response) {
    const requester_id = request.user.id
    const league_id = request.params.league_id as string | undefined;
    const user_id = request.params.user_id as string | undefined;
    const body = createLeagueMemberSchema.parse(request.body);

    const member = await this.leagueMembersService.update(
      requester_id,
      league_id,
      user_id,
      body
    );

    return response.json(member);
  }

  async remove(request: Request, response: Response) {
    const requester_id = request.user.id
    const league_id = request.params.league_id as string | undefined;
    const user_id = request.params.user_id as string | undefined;

    await this.leagueMembersService.remove(requester_id, league_id, user_id);

    return response.status(204).send();
  }
}