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

    join_policy: z.enum([
      "open",
      "request",
      "invite_only"
    ]),

    max_players: z
      .number()
      .min(2)
      .max(500),

  });

export const createLeagueMemberSchema =
  z.object({
    role: z.enum([
      "admin",
      "player",
      "spec",
      "owner"
    ]),
  });
