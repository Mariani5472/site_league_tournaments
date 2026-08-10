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
        const leagueId = request.params.leagueId as string | undefined;
        const league = await this.leaguesService.show(leagueId, request.user.id);
        return response.json(league);
    }
    async create(request: Request, response: Response) {
        const userId = request.user.id;
        const body = createLeagueSchema.parse(request.body);
        const league = await this.leaguesService.create(userId, {
            ownerId: userId,
            ...body
        });
        return response.status(201).json(league);
    }
    async join(request: Request, response: Response) {
        const member = await this.leaguesService.join(request.params.leagueId as string, request.user.id);
        return response.status(200).json(member);
    }
    async update(request: Request, response: Response) {
        const leagueId = request.params.leagueId as string | undefined;
        const userId = request.user.id;
        const league = await this.leaguesService.update(leagueId, userId, updateLeagueSchema.parse(request.body));
        return response
            .status(200)
            .json(league);
    }
    async remove(request: Request, response: Response) {
        const leagueId = request.params.leagueId as string | undefined;
        const userId = request.user.id;
        await this.leaguesService.remove(leagueId, userId);
        return response
            .status(204)
            .send();
    }
}
