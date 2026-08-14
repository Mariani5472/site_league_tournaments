import { z } from 'zod';
export const createLeagueMemberParamsSchema = z.object({
    leagueId: z.uuid(),
    memberId: z.uuid(),
});
export const listLeagueMembersParamsSchema = z.object({
    leagueId: z.uuid(),
});
export const listLeagueMembersQuerySchema = z.object({
    nickname: z.union([z.string(), z.array(z.string())]).optional().transform(value => value ? [value].flat() : undefined),
    role: z.union([z.string(), z.array(z.string())]).optional().transform(value => value ? [value].flat() : undefined),
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
