import { Request, Response } from "express";
import { z } from "zod";
import { MatchesService } from "./matches.service";
const voteSchema = z.object({ winnerTeam: z.number().int().min(1).max(2) });
const resolveSchema = voteSchema.extend({ reason: z.string().trim().min(5).max(500) });
export class MatchesController {
    private matchesService = new MatchesService();
    async show(req: Request, res: Response) {
        const match = await this.matchesService.show(req.params.matchId as string, req.user.id);
        return res.json(match);
    }
    async vote(req: Request, res: Response) {
        const body = voteSchema.parse(req.body);
        const match = await this.matchesService.vote(req.params.matchId as string, req.user.id, body.winnerTeam);
        return res.json(match);
    }
    async resolve(req: Request, res: Response) { const body = resolveSchema.parse(req.body); return res.json(await this.matchesService.resolve(req.params.matchId as string, req.user.id, body.winnerTeam, body.reason)); }
    async list(req: Request, res: Response) { return res.json(await this.matchesService.list(req.params.leagueId as string, req.user.id)); }
    async standings(req: Request, res: Response) { return res.json(await this.matchesService.standings(req.params.leagueId as string, req.user.id)); }
}
