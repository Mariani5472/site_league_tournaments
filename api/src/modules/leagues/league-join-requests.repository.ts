import { db } from "../../database/connection";
import { LeagueJoinRequestsParams } from "./leagues.types";

export class LeagueJoinRequestsRepository {
  async list(params: LeagueJoinRequestsParams) {
    const values: unknown[] = [];
    const where: string[] = [];

    let query = `
      SELECT
        ljr.id,
        ljr.status,
        ljr.created_at,

        u.id AS user_id,
        u.nickname,
        u.avatar_url

      FROM league_join_requests ljr

      INNER JOIN users u
        ON u.id = ljr.user_id
    `;

    values.push(params.league_id);
    where.push(`ljr.league_id = $${values.length}`);

    if (params.status?.length) {
      values.push(params.status);
      where.push(`ljr.status = ANY($${values.length})`);
    }

    if (params.search?.length) {
      values.push(`%${params.search}%`);
      where.push(`u.nickname ILIKE $${values.length}`);
    }

    if (where.length) {
      query += ` WHERE ${where.join(" AND ")}`;
    }


    query += ` ORDER BY ljr.created_at ASC`;

    const result = await db.query(query, values);

    return result.rows;
  }

  async create(params: { league_id: string; user_id: string; }) {
    const query = `
        INSERT INTO league_join_requests (
          league_id,
          user_id,
          status
        )
        VALUES (
          $1,
          $2,
          'pending'
        )
      `;

    await db.query(query, [
      params.leagueId,
      params.userId
    ]);
  }

  async approve(requestId: string) {
    const query = `
      UPDATE league_join_requests
      SET status = 'approved'
      WHERE id = $1
    `;

    await db.query(query, [
      requestId
    ]);
  }

  async update(requestId: string) {
    const query = `
      UPDATE league_join_requests
      SET status = 'rejected'
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [requestId]);

    return result.rows[0];
  }

  // async approve(requestId: string) {
  //   const query = `
  //     UPDATE league_join_requests
  //     SET status = 'approved'
  //     WHERE id = $1
  //   `;

  //   await db.query(query, [
  //     requestId
  //   ]);
  // }

  // async reject(requestId: string) {
  //   const query = `
  //     UPDATE league_join_requests
  //     SET status = 'rejected'
  //     WHERE id = $1
  //     RETURNING *
  //   `;

  //   const result = await db.query(query, [requestId]);

  //   return result.rows[0];
  // }
}