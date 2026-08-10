import { z } from 'zod';

export const createLeagueMemberParamsSchema = z.object({
  leagueId: z.uuid(),
  memberId: z.uuid(),
});

export const createLeagueMemberBodySchema = z.object({
  role: z.enum([
    "admin",
    "player",
    "spec",
  ]),
});

export const updateLeagueMemberBodySchema = z.object({
  role: z.enum([
    "owner",
    "admin",
    "player",
    "spec",
  ]),
});
