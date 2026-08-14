import { z } from "zod";

export const linkRiotAccountBodySchema = z.object({
    gameName: z.string().trim().min(1).max(100),
    tagLine: z.string().trim().min(1).max(20),
}).strict();
