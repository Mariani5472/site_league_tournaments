import { z } from "zod";

export const createLeagueSchema =
  z.object({
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
      .max(500)
  });