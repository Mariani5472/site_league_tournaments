import { z } from "zod";
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from "../@types/shared/CursorPage";
export const cursorPaginationSchema = z.object({
    cursor: z.uuid().optional(),
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
});
