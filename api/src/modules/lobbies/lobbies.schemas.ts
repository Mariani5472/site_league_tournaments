import { z } from "zod";
export const createLobbySchema = z.object({
    leagueId: z.uuid(),
    creatorId: z.uuid(),
    maxPlayers: z.number().min(2).max(10),
});
