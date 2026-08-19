import { db } from "../../database/connection";
import type { FindOptions } from "../../@types/shared/FindOptions";
import type { QueryOptions } from "../../@types/shared/QueryOptions";
import {
  toCursorPage,
  type CursorParams,
} from "../../@types/shared/CursorPage";
import type {
  LeagueInvitation,
  LeagueInvitationStatus,
} from "./league-invitations.types";

export class LeagueInvitationsRepository {
  async listForRecipient(recipientId: string, params: CursorParams) {
    const result = await db.query<LeagueInvitation>(
      `SELECT invitation.*, league.name AS league_name, inviter.nickname AS inviter_nickname
             FROM league_invitations invitation
             JOIN leagues league ON league.id = invitation.league_id
             JOIN users inviter ON inviter.id = invitation.invited_by
             WHERE invitation.recipient_id = $1
               AND invitation.status = 'pending'
               AND ($2::uuid IS NULL OR invitation.id < $2)
             ORDER BY invitation.id DESC LIMIT $3`,
      [recipientId, params.cursor ?? null, params.limit + 1],
    );
    return toCursorPage(result.rows, params.limit);
  }

  async findById(invitationId: string, options: FindOptions = {}) {
    const { executor = db, lock } = options;
    const result = await executor.query<LeagueInvitation>(
      `SELECT * FROM league_invitations WHERE id = $1
             ${lock === "update" ? "FOR UPDATE" : ""}`,
      [invitationId],
    );
    return result.rows[0] ?? null;
  }

  async findPending(
    leagueId: string,
    recipientId: string,
    options: FindOptions = {},
  ) {
    const { executor = db, lock } = options;
    const result = await executor.query<LeagueInvitation>(
      `SELECT * FROM league_invitations
             WHERE league_id = $1 AND recipient_id = $2 AND status = 'pending'
             ${lock === "update" ? "FOR UPDATE" : ""}`,
      [leagueId, recipientId],
    );
    return result.rows[0] ?? null;
  }

  async create(leagueId: string, recipientId: string, invitedBy: string) {
    const result = await db.query<LeagueInvitation>(
      `INSERT INTO league_invitations (league_id, recipient_id, invited_by)
             VALUES ($1, $2, $3) RETURNING *`,
      [leagueId, recipientId, invitedBy],
    );
    return result.rows[0];
  }

  async updateStatus(
    invitationId: string,
    status: LeagueInvitationStatus,
    options: QueryOptions = {},
  ) {
    const { executor = db } = options;
    const result = await executor.query<LeagueInvitation>(
      `UPDATE league_invitations SET status = $2, updated_at = current_timestamp
             WHERE id = $1 RETURNING *`,
      [invitationId, status],
    );
    return result.rows[0];
  }
}
