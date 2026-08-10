import { Request, Response } from "express";
import { LeagueJoinRequestsService } from "./league-join-requests.service";
import { leagueJoinRequestIdentityParamsSchema, leagueJoinRequestParamsSchema, listLeagueJoinRequestsQuerySchema, updateLeagueJoinRequestBodySchema } from "./league-join-requests.schemas";
export class LeagueJoinRequestsController {
    private readonly leagueJoinRequestsService = new LeagueJoinRequestsService();
    async list(request: Request, response: Response) {
        const requesterId = request.user.id;
        const { leagueId } = leagueJoinRequestParamsSchema.parse(request.params);
        const query = listLeagueJoinRequestsQuerySchema.parse(request.query);
        const requests = await this.leagueJoinRequestsService.list(requesterId, leagueId, query);
        return response.json(requests);
    }
    async create(request: Request, response: Response) {
        const { leagueId } = leagueJoinRequestParamsSchema.parse(request.params);
        const userId = request.user.id;
        const joinRequest = await this.leagueJoinRequestsService.create(userId, leagueId);
        return response.status(201).json(joinRequest);
    }
    async update(request: Request, response: Response) {
        const { leagueId, requestId } = leagueJoinRequestIdentityParamsSchema.parse(request.params);
        const requesterId = request.user.id;
        const body = updateLeagueJoinRequestBodySchema.parse(request.body);
        const joinRequest = await this.leagueJoinRequestsService.update(leagueId, requestId, requesterId, body);
        return response.status(200).json(joinRequest);
    }
    async remove(request: Request, response: Response) {
        const { leagueId, requestId } = leagueJoinRequestIdentityParamsSchema.parse(request.params);
        const requesterId = request.user.id;
        await this.leagueJoinRequestsService.remove(leagueId, requestId, requesterId);
        return response.status(204).send();
    }
}
