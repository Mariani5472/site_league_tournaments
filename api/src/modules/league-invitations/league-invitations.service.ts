import { db } from "../../database/connection";
import type { CursorParams } from "../../@types/shared/CursorPage";
import type { FindOptions } from "../../@types/shared/FindOptions";
import { AppError } from "../../utils/AppError";
import { SocketEmitter } from "../../websocket/emitter";
import { SocketAccess } from "../../websocket/socket-access";
import { SOCKET_EVENTS } from "../../websocket/socket-events";
import { LeagueMembersRepository } from "../league-members/league-members.repository";
import { LeaguesRepository } from "../leagues/leagues.repository";
import { UsersRepository } from "../users/users.repository";
import { LeagueInvitationsRepository } from "./league-invitations.repository";

export class LeagueInvitationsService {
  private readonly invitations = new LeagueInvitationsRepository();
  private readonly leagues = new LeaguesRepository();
  private readonly members = new LeagueMembersRepository();
  private readonly users = new UsersRepository();

  list(recipientId: string, params: CursorParams) {
    return this.invitations.listForRecipient(recipientId, params);
  }

  async create(requesterId: string, leagueId: string, recipientId: string) {
    const league = await this.leagues.findById(leagueId);
    if (!league) throw new AppError("League not found", 404);
    if (league.joinPolicy !== "invite_only")
      throw new AppError("League does not use invitations", 409);
    const requester = await this.members.findByLeagueAndUser(
      leagueId,
      requesterId,
    );
    if (!requester || !["owner", "admin"].includes(requester.role))
      throw new AppError(
        "Only league owners and admins can invite players",
        403,
      );
    if (!(await this.users.findById(recipientId)))
      throw new AppError("Player not found", 404);
    if (await this.members.findByLeagueAndUser(leagueId, recipientId))
      throw new AppError("Player is already a member", 409);
    if (await this.invitations.findPending(leagueId, recipientId))
      throw new AppError("An active invitation already exists", 409);
    const invitation = await this.invitations.create(
      leagueId,
      recipientId,
      requesterId,
    );
    SocketEmitter.emitToUser(
      recipientId,
      SOCKET_EVENTS.LEAGUE_INVITATIONS_UPDATE,
      {
        leagueId,
        invitationId: invitation.id,
      },
    );
    SocketEmitter.emitToLeague(
      leagueId,
      SOCKET_EVENTS.LEAGUE_INVITATIONS_UPDATE,
      {
        leagueId,
        invitationId: invitation.id,
      },
    );
    return invitation;
  }

  async respond(
    recipientId: string,
    invitationId: string,
    status: "accepted" | "rejected",
  ) {
    const client = await db.connect();
    let invitation;
    try {
      await client.query("BEGIN");
      const options = {
        executor: client,
        lock: "update",
      } satisfies FindOptions;
      invitation = await this.invitations.findById(invitationId, options);
      if (!invitation) throw new AppError("Invitation not found", 404);
      if (invitation.recipientId !== recipientId)
        throw new AppError("Invitation belongs to another player", 403);
      if (invitation.status !== "pending")
        throw new AppError("Invitation has already been processed", 409);
      const league = await this.leagues.findById(invitation.leagueId, options);
      if (!league) throw new AppError("League not found", 404);
      if (status === "accepted") {
        const existing = await this.members.findByLeagueAndUser(
          league.id,
          recipientId,
          options,
        );
        if (existing) throw new AppError("Player is already a member", 409);
        const memberCount = await this.members.count(league.id, options);
        if (memberCount >= league.maxPlayers)
          throw new AppError("League is full", 409);
        await this.members.create(
          league.id,
          recipientId,
          { role: "player" },
          options,
        );
      }
      invitation = await this.invitations.updateStatus(
        invitationId,
        status,
        options,
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    if (status === "accepted") {
      await SocketAccess.grantMembership(recipientId, invitation.leagueId);
      SocketEmitter.emitToLeague(
        invitation.leagueId,
        SOCKET_EVENTS.LEAGUE_MEMBERS_UPDATE,
        { leagueId: invitation.leagueId },
      );
    }
    this.emitInvitationUpdate(
      invitation.recipientId,
      invitation.leagueId,
      invitation.id,
    );
    return invitation;
  }

  async cancel(requesterId: string, leagueId: string, invitationId: string) {
    const client = await db.connect();
    let invitation;
    try {
      await client.query("BEGIN");
      const options = {
        executor: client,
        lock: "update",
      } satisfies FindOptions;
      const requester = await this.members.findByLeagueAndUser(
        leagueId,
        requesterId,
        options,
      );
      if (!requester || !["owner", "admin"].includes(requester.role))
        throw new AppError(
          "Only league owners and admins can cancel invitations",
          403,
        );
      invitation = await this.invitations.findById(invitationId, options);
      if (!invitation || invitation.leagueId !== leagueId)
        throw new AppError("Invitation not found", 404);
      if (invitation.status !== "pending")
        throw new AppError("Invitation has already been processed", 409);
      invitation = await this.invitations.updateStatus(
        invitationId,
        "cancelled",
        options,
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    this.emitInvitationUpdate(invitation.recipientId, leagueId, invitation.id);
    return invitation;
  }

  private emitInvitationUpdate(
    recipientId: string,
    leagueId: string,
    invitationId: string,
  ) {
    const payload = { leagueId, invitationId };
    SocketEmitter.emitToUser(
      recipientId,
      SOCKET_EVENTS.LEAGUE_INVITATIONS_UPDATE,
      payload,
    );
    SocketEmitter.emitToLeague(
      leagueId,
      SOCKET_EVENTS.LEAGUE_INVITATIONS_UPDATE,
      payload,
    );
  }
}
