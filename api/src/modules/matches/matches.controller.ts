import { Request, Response } from "express";
import { z } from "zod";
import { MatchesService } from "./matches.service";

const voteSchema = z.object({ winner_team: z.number().int().min(1).max(2) });
const resolveSchema = voteSchema.extend({ reason: z.string().trim().min(5).max(500) });

export class MatchesController {
  private matchesService = new MatchesService();
  async show(req: Request, res: Response) {
    const match = await this.matchesService.show(req.params.match_id as string, req.user.id)
    return res.json(match);
  }

  async vote(req: Request, res: Response) {
    const body = voteSchema.parse(req.body);
    const match = await this.matchesService.vote(req.params.match_id as string, req.user.id, body.winner_team)
    return res.json(match);
  }
  async resolve(req: Request, res: Response) { const body = resolveSchema.parse(req.body); return res.json(await this.service.resolve(req.params.match_id as string, req.user.id, body.winner_team, body.reason)); }
  async list(req: Request, res: Response) { return res.json(await this.service.list(req.params.league_id as string, req.user.id)); }
  async standings(req: Request, res: Response) { return res.json(await this.service.standings(req.params.league_id as string, req.user.id)); }
}
