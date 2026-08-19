import { z } from "zod";
import { cursorPaginationSchema } from "../../schemas/pagination.schemas";
export const leagueParamsSchema = z.object({ leagueId: z.uuid() });
export const listLeaguesQuerySchema = z.object({
    membership: z.union([z.string(), z.array(z.string())]).optional().transform(value => value ? [value].flat() : undefined),
    visibility: z.enum(["public", "private"]).optional(),
    search: z.string().trim().optional(),
});
export const discoverLeaguesQuerySchema = cursorPaginationSchema.extend({ search: z.string().trim().optional() });
export const createLeagueSchema = z.object({
    name: z
        .string()
        .trim()
        .min(3)
        .max(100),
    description: z
        .string()
        .trim()
        .max(500)
        .optional(),
    visibility: z.enum([
        "public",
        "private"
    ]),
    joinPolicy: z.enum([
        "open",
        "request",
        "invite_only"
    ]),
    maxPlayers: z
        .number()
        .min(2)
        .max(500),
});
export const updateLeagueSchema = z.object({
    name: z.string().trim().min(3).max(100).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    visibility: z.enum(["public", "private"]).optional(),
    joinPolicy: z.enum(["open", "request", "invite_only"]).optional(),
    maxPlayers: z.number().int().min(2).max(500).optional(),
    lobbyCreationPolicy: z.enum(["admins", "members"]).optional(),
    autoStartLobby: z.boolean().optional()
}).strict().refine(body => Object.keys(body).length > 0, {
    message: "At least one field must be provided"
});
