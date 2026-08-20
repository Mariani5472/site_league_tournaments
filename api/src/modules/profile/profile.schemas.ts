import { z } from "zod";
import { cursorPaginationSchema } from "../../schemas/pagination.schemas";
import { imageUrlSchema } from "../../schemas/image.schemas";

export const profileParamsSchema = z.object({ userId: z.uuid() });
export const discoverPlayersQuerySchema = cursorPaginationSchema.extend({
    search: z.string().trim().max(50).default(""),
});
export const updateProfileBodySchema = z.object({
    nickname: z.string().trim().min(2).max(50),
    avatarUrl: imageUrlSchema.nullable().optional(),
    bannerUrl: imageUrlSchema.nullable().optional(),
}).strict();
