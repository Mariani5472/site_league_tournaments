import { db } from "../../database/connection";
import { LeagueJoinRequest, LeagueJoinRequestsDTO, ListLeagueJoinRequestsParams } from "../leagues/leagues.types";
import { FindOptions } from "../../@types/shared/FindOptions";
import { QueryOptions } from "../../@types/shared/QueryOptions";
export class LeagueJoinRequestsRepository {
    async list(leagueId: string, params: ListLeagueJoinRequestsParams) {
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
        values.push(leagueId);
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
    async findById(requestId: string, leagueId?: string, options: FindOptions = {}) {
        const { executor = db, lock } = options;
        const query = `
      SELECT * 
      FROM league_join_requests 
      WHERE id = $1
      AND ($2::uuid IS NULL OR league_id = $2)
      ${lock === "update" ? "FOR UPDATE" : ""}
    `;
        const result = await executor.query<LeagueJoinRequest>(query, [requestId, leagueId ?? null]);
        return result.rows[0];
    }
    async findByLeagueAndUser(leagueId: string, userId: string) {
        const query = `
      SELECT * 
      FROM league_join_requests 
      WHERE user_id = $1
      AND league_id = $2
    `;
        const result = await db.query<LeagueJoinRequest>(query, [
            userId,
            leagueId
        ]);
        return result.rows;
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
            params.leagueId,
            params.userId
        ]);
        return result.rows[0];
    }
    async update(requestId: string, params: {
        status: "rejected" | "approved";
    }, options: QueryOptions = {}) {
        const { executor = db } = options;
        const query = `
      UPDATE league_join_requests
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
        const result = await executor.query<LeagueJoinRequest>(query, [
            params.status,
            requestId
        ]);
        return result.rows[0];
    }
    async delete(requestId: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        const query = `
    DELETE FROM league_join_requests WHERE id = $1
    `;
        await executor.query(query, [requestId]);
    }
}
