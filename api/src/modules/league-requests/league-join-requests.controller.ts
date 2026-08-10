import { Request, Response } from "express";
import { LeagueJoinRequestsService } from "./league-join-requests.service";
import { parseStringArray } from "../../utils/parseStringArray";
import { updateJoinRequestSchema } from "../leagues/leagues.schemas";
export class LeagueJoinRequestsController {
    private readonly leagueJoinRequestsService = new LeagueJoinRequestsService();
    async list(request: Request, response: Response) {
        const requesterId = request.user.id;
        const leagueId = request.params.leagueId as string;
        const status = parseStringArray(request.query.status);
        const search = request.query.search as string | undefined;
        const requests = await this.leagueJoinRequestsService.list(requesterId, leagueId, {
            status,
            search
        });
        return response.json(requests);
    }
    async create(request: Request, response: Response) {
        const leagueId = request.params.leagueId as string;
        const userId = request.user.id;
        const joinRequest = await this.leagueJoinRequestsService.create(userId, leagueId);
        return response.status(201).json(joinRequest);
    }
    async update(request: Request, response: Response) {
        const leagueId = request.params.leagueId as string;
        const requestId = request.params.requestId as string;
        const requesterId = request.user.id;
        const params = updateJoinRequestSchema.parse(request.body);
        const joinRequest = await this.leagueJoinRequestsService.update(leagueId, requestId, requesterId, params);
        return response.status(200).json(joinRequest);
    }
    async remove(request: Request, response: Response) {
        const leagueId = request.params.leagueId as string;
        const requestId = request.params.requestId as string;
        const requesterId = request.user.id;
        await this.leagueJoinRequestsService.remove(leagueId, requestId, requesterId);
        return response.status(204).send();
    }
}
