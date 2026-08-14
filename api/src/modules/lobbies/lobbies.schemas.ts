import { z } from "zod";

export const leagueLobbiesParamsSchema = z.object({ leagueId: z.uuid() });
export const lobbyParamsSchema = leagueLobbiesParamsSchema.extend({ lobbyId: z.uuid() });

export const createLobbyBodySchema = z.object({
    maxPlayers: z.number().int().min(2).max(10),
}).strict();

export const changeLobbyTeamBodySchema = z.object({
    teamNumber: z.number().int().min(1).max(2).optional(),
}).strict();

export const teamSelectionVoteBodySchema = z.object({
    mode: z.enum(["random", "balanced", "player_picks"]),
}).strict();

export const teamSelectionConfirmationBodySchema = z.object({
    decision: z.enum(["accept", "reroll"]),
}).strict();

export const captainVoteBodySchema = z.object({ candidateId: z.uuid() }).strict();
export const draftPickBodySchema = z.object({ userId: z.uuid() }).strict();
