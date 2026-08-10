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

  join_policy: z.enum([
    "open",
    "request",
    "invite_only"
  ]),

  max_players: z
    .number()
    .min(2)
    .max(128),

  require_riot_account: z
    .boolean()
});

export type LeagueSettingsForm = z.infer<typeof leagueSettingsSchema>;