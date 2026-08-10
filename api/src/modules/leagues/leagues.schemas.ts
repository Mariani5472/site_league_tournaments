import { z } from "zod";
export const createLeagueSchema = z.object({
    name: z
        .string()
        .min(3)
        .max(100),
    description: z
        .string()
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
    description: z.string().max(500).nullable().optional(),
    visibility: z.enum(["public", "private"]).optional(),
    joinPolicy: z.enum(["open", "request", "invite_only"]).optional(),
    maxPlayers: z.number().int().min(2).max(500).optional()
}).strict().refine(body => Object.keys(body).length > 0, {
    message: "At least one field must be provided"
});
export const updateJoinRequestSchema = z.object({
    status: z.enum(["approved", "rejected"])
}).strict();
