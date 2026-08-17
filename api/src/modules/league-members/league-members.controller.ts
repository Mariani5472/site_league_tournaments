import { Request, Response } from "express";
import { LeagueMembersService } from "./league-members.service";
import { createLeagueMemberBodySchema, createLeagueMemberParamsSchema, listLeagueMembersParamsSchema, listLeagueMembersQuerySchema, updateLeagueMemberBodySchema } from "./leagues-members.schemas";
export class LeagueMembersController {
    private readonly leagueMembersService = new LeagueMembersService();
    async list(request: Request, response: Response) {
        const { leagueId } = listLeagueMembersParamsSchema.parse(request.params);
        const userId = request.user.id;
        const query = listLeagueMembersQuerySchema.parse(request.query);
        const members = await this.leagueMembersService.list(userId, leagueId, query);
        return response.json(members);
    }
    async create(request: Request, response: Response) {
        const requesterId = request.user.id;
        const { leagueId, memberId } = createLeagueMemberParamsSchema.parse(request.params);
        const body = createLeagueMemberBodySchema.parse(request.body);
        const member = await this.leagueMembersService.create(requesterId, leagueId, memberId, body);
        return response.status(201).json(member);
    }
    async update(request: Request, response: Response) {
        const requesterId = request.user.id;
        const { leagueId, memberId } = createLeagueMemberParamsSchema.parse(request.params);
        const body = updateLeagueMemberBodySchema.parse(request.body);
        const member = await this.leagueMembersService.update(requesterId, leagueId, memberId, body);
        return response.json(member);
    }
    async remove(request: Request, response: Response) {
        const requesterId = request.user.id;
        const { leagueId, memberId } = createLeagueMemberParamsSchema.parse(request.params);
        await this.leagueMembersService.remove(requesterId, leagueId, memberId);
        return response.status(204).send();
    }
    async leave(request: Request, response: Response) {
        const requesterId = request.user.id;
        const { leagueId } = listLeagueMembersParamsSchema.parse(request.params);
        await this.leagueMembersService.removeSelf(requesterId, leagueId);
        return response.status(204).send();
    }
}
