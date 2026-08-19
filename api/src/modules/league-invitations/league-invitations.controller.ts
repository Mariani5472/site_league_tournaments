import type { Request, Response } from "express";
import { LeagueInvitationsService } from "./league-invitations.service";
import {
  createLeagueInvitationBodySchema,
  leagueInvitationIdentityParamsSchema,
  leagueInvitationLeagueParamsSchema,
  leagueInvitationParamsSchema,
  listLeagueInvitationsQuerySchema,
  respondLeagueInvitationBodySchema,
} from "./league-invitations.schemas";

export class LeagueInvitationsController {
  private readonly service = new LeagueInvitationsService();

  async list(request: Request, response: Response) {
    const query = listLeagueInvitationsQuerySchema.parse(request.query);
    return response.json(await this.service.list(request.user.id, query));
  }

  async create(request: Request, response: Response) {
    const { leagueId } = leagueInvitationLeagueParamsSchema.parse(
      request.params,
    );
    const { recipientId } = createLeagueInvitationBodySchema.parse(
      request.body,
    );
    return response
      .status(201)
      .json(await this.service.create(request.user.id, leagueId, recipientId));
  }

  async respond(request: Request, response: Response) {
    const { invitationId } = leagueInvitationParamsSchema.parse(request.params);
    const { status } = respondLeagueInvitationBodySchema.parse(request.body);
    return response.json(
      await this.service.respond(request.user.id, invitationId, status),
    );
  }

  async cancel(request: Request, response: Response) {
    const { leagueId, invitationId } =
      leagueInvitationIdentityParamsSchema.parse(request.params);
    return response.json(
      await this.service.cancel(request.user.id, leagueId, invitationId),
    );
  }
}
