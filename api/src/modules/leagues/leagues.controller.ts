import { parseStringArray } from "../../utils/parseStringArray";
import { createLeagueSchema, updateLeagueSchema } from "./leagues.schemas";
import { LeaguesService } from "./leagues.service";
import { Request, Response } from "express";

export class LeaguesController {
  private readonly leaguesService = new LeaguesService();

  async list(request: Request, response: Response) {
    const membership = parseStringArray(request.query.membership);
    const visibility = request.query.visibility as string | undefined;
    const search = request.query.search as string | undefined;

    const leagues = await this.leaguesService.list(request.user.id, {
      membership,
      visibility,
      search,
    });
    return response.json(leagues);
  }

  async mine(request: Request, response: Response) {
    const leagues = await this.leaguesService.mine(request.user.id);
    return response.json(leagues);
  }

  async discover(request: Request, response: Response) {
    const search = request.query.search as string | undefined;
    const leagues = await this.leaguesService.discover(request.user.id, search);
    return response.json(leagues);
  }

  async show(request: Request, response: Response) {
    const league_id = request.params.league_id as string | undefined;
    const league = await this.leaguesService.show(league_id, request.user.id);
    return response.json(league);
  }

  async create(request: Request, response: Response) {
    const user_id = request.user.id;
    const body = createLeagueSchema.parse(request.body);

    const league = await this.leaguesService.create(user_id, {
      owner_id: user_id,
      ...body
    });

    return response.status(201).json(league);
  }

  async join(request: Request, response: Response) {
    const member = await this.leaguesService.join(request.params.league_id as string, request.user.id);
    return response.status(201).json(member);
  }

  async update(request: Request, response: Response) {
    const league_id = request.params.league_id as string | undefined;
    const user_id = request.user.id;

    const league = await this.leaguesService.update(
      league_id,
      user_id,
      updateLeagueSchema.parse(request.body)
    );

    return response
      .status(201)
      .json(league);
  }

  async remove(request: Request, response: Response) {
    const league_id = request.params.league_id as string | undefined;
    const user_id = request.user.id;

    await this.leaguesService.remove(
      league_id,
      user_id
    );

    return response
      .status(204)
      .send();
  }
}
