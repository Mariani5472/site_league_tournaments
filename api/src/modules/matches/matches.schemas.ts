import { z } from "zod";

export const matchParamsSchema = z.object({ matchId: z.uuid() });
export const leagueMatchesParamsSchema = z.object({ leagueId: z.uuid() });
export const voteMatchBodySchema = z.object({ winnerTeam: z.number().int().min(1).max(2) }).strict();
export const resolveMatchBodySchema = voteMatchBodySchema.extend({ reason: z.string().trim().min(5).max(500) });
