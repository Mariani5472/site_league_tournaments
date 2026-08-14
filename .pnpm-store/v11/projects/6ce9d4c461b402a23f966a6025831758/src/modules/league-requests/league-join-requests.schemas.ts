import { z } from "zod";
import { cursorPaginationSchema } from "../../schemas/pagination.schemas";

export const leagueJoinRequestParamsSchema = z.object({
    leagueId: z.uuid(),
});

export const leagueJoinRequestIdentityParamsSchema = leagueJoinRequestParamsSchema.extend({
    requestId: z.uuid(),
});

export const listLeagueJoinRequestsQuerySchema = cursorPaginationSchema.extend({
    status: z.union([z.string(), z.array(z.string())]).optional().transform(value => value ? [value].flat() : undefined),
    search: z.string().trim().optional(),
});

export const updateLeagueJoinRequestBodySchema = z.object({
    status: z.enum(["approved", "rejected"]),
}).strict();
