import { Request, Response } from "express";
import { MatchesService } from "./matches.service";
import { leagueMatchesParamsSchema, matchParamsSchema, resolveMatchBodySchema, voteMatchBodySchema } from "./matches.schemas";

export class MatchesController {
    private readonly matchesService = new MatchesService();

    async show(request: Request, response: Response) {
        const { matchId } = matchParamsSchema.parse(request.params);
        const match = await this.matchesService.show(matchId, request.user.id);
        return response.json(match);
    }

    async vote(request: Request, response: Response) {
        const { matchId } = matchParamsSchema.parse(request.params);
        const body = voteMatchBodySchema.parse(request.body);
        const match = await this.matchesService.vote(matchId, request.user.id, body.winnerTeam);
        return response.json(match);
    }

    async resolve(request: Request, response: Response) {
        const { matchId } = matchParamsSchema.parse(request.params);
        const body = resolveMatchBodySchema.parse(request.body);
        const match = await this.matchesService.resolve(matchId, request.user.id, body.winnerTeam, body.reason);
        return response.json(match);
    }

    async list(request: Request, response: Response) {
        const { leagueId } = leagueMatchesParamsSchema.parse(request.params);
        const matches = await this.matchesService.list(leagueId, request.user.id);
        return response.json(matches);
    }

    async standings(request: Request, response: Response) {
        const { leagueId } = leagueMatchesParamsSchema.parse(request.params);
        const standings = await this.matchesService.standings(leagueId, request.user.id);
        return response.json(standings);
    }
}
