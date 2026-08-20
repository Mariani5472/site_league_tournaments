import { z } from "zod";

export const platformRoleParamsSchema = z.object({ userId: z.uuid() }).strict();
