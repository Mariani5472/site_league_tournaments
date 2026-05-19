import { z } from "zod";

export const createUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  nickname: z.string().min(3).max(30)
});