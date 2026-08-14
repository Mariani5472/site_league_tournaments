import { z } from "zod";

const uuidPayload = z.uuid();

export const leagueJoinPayloadSchema = uuidPayload;
export const leagueLeavePayloadSchema = uuidPayload;
export const lobbyJoinPayloadSchema = uuidPayload;
export const lobbyLeavePayloadSchema = uuidPayload;
