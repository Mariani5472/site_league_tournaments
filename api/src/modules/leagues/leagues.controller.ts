import { createLeagueSchema, discoverLeaguesQuerySchema, leagueParamsSchema, listLeaguesQuerySchema, updateLeagueSchema } from "./leagues.schemas";
import { LeaguesService } from "./leagues.service";
import { Request, Response } from "express";
export class LeaguesController {
    private readonly leaguesService = new LeaguesService();
    async list(request: Request, response: Response) {
        const query = listLeaguesQuerySchema.parse(request.query);
        const leagues = await this.leaguesService.list(request.user.id, query);
        return response.json(leagues);
    }
    async mine(request: Request, response: Response) {
        const leagues = await this.leaguesService.mine(request.user.id);
        return response.json(leagues);
    }
    async discover(request: Request, response: Response) {
        const { search } = discoverLeaguesQuerySchema.parse(request.query);
        const leagues = await this.leaguesService.discover(request.user.id, search);
        return response.json(leagues);
    }
    async show(request: Request, response: Response) {
        const { leagueId } = leagueParamsSchema.parse(request.params);
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
        const { leagueId } = leagueParamsSchema.parse(request.params);
        const member = await this.leaguesService.join(leagueId, request.user.id);
        return response.status(200).json(member);
    }
    async update(request: Request, response: Response) {
        const { leagueId } = leagueParamsSchema.parse(request.params);
        const userId = request.user.id;
        const body = updateLeagueSchema.parse(request.body);
        const league = await this.leaguesService.update(leagueId, userId, body);
        return response.json(league);
    }
    async remove(request: Request, response: Response) {
        const { leagueId } = leagueParamsSchema.parse(request.params);
        const userId = request.user.id;
        await this.leaguesService.remove(leagueId, userId);
        return response.status(204).send();
    }
}
