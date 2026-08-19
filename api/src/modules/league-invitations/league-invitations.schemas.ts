import { z } from "zod";
import { cursorPaginationSchema } from "../../schemas/pagination.schemas";

export const leagueInvitationLeagueParamsSchema = z.object({
  leagueId: z.uuid(),
});
export const leagueInvitationParamsSchema = z.object({
  invitationId: z.uuid(),
});
export const leagueInvitationIdentityParamsSchema = z.object({
  leagueId: z.uuid(),
  invitationId: z.uuid(),
});
export const createLeagueInvitationBodySchema = z
  .object({ recipientId: z.uuid() })
  .strict();
export const respondLeagueInvitationBodySchema = z
  .object({ status: z.enum(["accepted", "rejected"]) })
  .strict();
export const listLeagueInvitationsQuerySchema = cursorPaginationSchema;
