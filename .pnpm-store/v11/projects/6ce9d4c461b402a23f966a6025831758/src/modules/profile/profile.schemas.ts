import { z } from "zod";

export const profileParamsSchema = z.object({ userId: z.uuid().optional() });
export const updateProfileBodySchema = z.object({
    nickname: z.string().trim().min(2).max(50),
    avatarUrl: z.url().nullable().optional(),
    bannerUrl: z.url().nullable().optional(),
}).strict();
