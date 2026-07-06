import { db } from "../../database/connection";
import { LeagueJoinRequest, LeagueJoinRequestsDTO, ListLeagueJoinRequestsParams } from "../leagues/leagues.types";

export class LeagueJoinRequestsRepository {
  async list(league_id: string, params: ListLeagueJoinRequestsParams) {
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

    values.push(league_id);
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

    const result = await db.query<LeagueJoinRequest[]>(query, values);

    return result.rows;
  }

  async findById(request_id: string) {
    const query = `
      SELECT * 
      FROM league_join_requests 
      WHERE id = $1
    `;

    const result = await db.query<LeagueJoinRequest>(query, [request_id]);

    return result.rows[0]
  }

  async findByLeagueAndUser(league_id: string, user_id: string) {
    const query = `
      SELECT * 
      FROM league_join_requests 
      WHERE user_id = $1
      AND league_id = $2
    `;

    const result = await db.query<LeagueJoinRequest>(query, [
      user_id,
      league_id
    ]);

    return result.rows[0]
  }

  async create(params: LeagueJoinRequestsDTO) {
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
          RETURNING *
      `;

    const result = await db.query<LeagueJoinRequest>(query, [
      params.league_id,
      params.user_id
    ]);

    return result.rows[0]
  }

  async update(request_id: string, params: {
    status: | "rejected" | "approved"
  }) {
    const query = `
      UPDATE league_join_requests
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await db.query<LeagueJoinRequest>(query, [
      params.status,
      request_id
    ]);

    return result.rows[0];
  }

  async delete(request_id: string) {
    const query = `
    DELETE FROM league_join_requests WHERE id = $1
    `;

    await db.query(query, [request_id]);
  }
}