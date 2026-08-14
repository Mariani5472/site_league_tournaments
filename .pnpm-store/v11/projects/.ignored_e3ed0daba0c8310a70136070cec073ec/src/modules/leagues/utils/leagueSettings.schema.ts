import { z } from "zod";
export const leagueSettingsSchema = z.object({
    name: z
        .string()
        .min(3)
        .max(50),
    description: z
        .string()
        .max(500),
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
        .max(128)
});
export type LeagueSettingsForm = z.infer<typeof leagueSettingsSchema>;
