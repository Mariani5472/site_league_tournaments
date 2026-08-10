import { db } from "../../database/connection";
import { FindOptions } from "../../@types/shared/FindOptions";
import { LeagueMember, LeagueMemberIdentity, UpdateLeagueMemberDTO } from "./league-members.types";
import { QueryOptions } from "../../@types/shared/QueryOptions";
export class LeagueMembersRepository {
    async list(leagueId: string, params: LeagueMemberIdentity): Promise<LeagueMember[]> {
        const values: unknown[] = [];
        const where: string[] = [];
        let query = `
      SELECT 
        lm.id,
        lm.role,
        u.id as user_id,
        u.nickname,
        u.avatar_url,
        u.avatar_url
      FROM league_members lm
      INNER JOIN users u
        ON lm.user_id = u.id
    `;
        values.push(leagueId);
        where.push(`lm.league_id = $${values.length}`);
        if (params.nickname?.length) {
            values.push(params.nickname);
            where.push(`u.nickname = ANY($${values.length})`);
        }
        if (params.userId?.length) {
            values.push(params.userId);
            where.push(`lm.user_id = ANY($${values.length})`);
        }
        if (params.role?.length) {
            values.push(params.role);
            where.push(`lm.role = ANY($${values.length})`);
        }
        if (where.length) {
            query += ` WHERE ${where.join(" AND ")}`;
        }
        query += ` ORDER BY u.nickname DESC`;
        const result = await db.query<LeagueMember>(query, values);
        return result.rows;
    }
    async count(leagueId: string, options: QueryOptions = {}): Promise<number> {
        const { executor = db } = options;
        const result = await executor.query<{
            total: number;
        }>(`
      SELECT COUNT(*)::int AS total
      FROM league_members
      WHERE league_id = $1
    `, [leagueId]);
        return result.rows[0].total;
    }
    async findById(memberId: string, options: FindOptions = {}): Promise<LeagueMember | null> {
        const { executor = db, lock, } = options;
        const result = await executor.query<LeagueMember>(`
      SELECT *
      FROM league_members
      WHERE id = $1
      ${lock === "update" ? "FOR UPDATE" : ""}
    `, [memberId]);
        return result.rows[0] ?? null;
    }
    async findByLeagueAndUser(leagueId: string, userId: string, options: FindOptions = {}): Promise<LeagueMember | null> {
        const { executor = db, lock, } = options;
        const query = `
      SELECT *
      FROM league_members
      WHERE league_id = $1
      AND user_id = $2
      ${lock === "update" ? "FOR UPDATE" : ""}
    `;
        const result = await executor.query<LeagueMember>(query, [leagueId, userId]);
        return result.rows[0] ?? null;
    }
    async create(leagueId: string, userId: string, params: Pick<LeagueMember, "role">, options: QueryOptions = {}): Promise<LeagueMember> {
        const { executor = db } = options;
        const query = `
      INSERT INTO league_members (
        league_id,
        user_id,
        role
      )
      VALUES ($1, $2, $3)
      RETURNING *
    `;
        const result = await executor.query<LeagueMember>(query, [
            leagueId,
            userId,
            params.role
        ]);
        return result.rows[0];
    }
    async update(leagueId: string, userId: string, params: UpdateLeagueMemberDTO, options: QueryOptions = {}): Promise<LeagueMember> {
        const { executor = db } = options;
        const query = `
    UPDATE league_members
    SET role = $3
    WHERE league_id = $1
      AND user_id = $2
    RETURNING *
  `;
        const result = await executor.query<LeagueMember>(query, [
            leagueId,
            userId,
            params.role
        ]);
        return result.rows[0];
    }
    async remove(leagueId: string, userId: string, options: QueryOptions = {}): Promise<void> {
        const { executor = db } = options;
        await executor.query(`
      DELETE FROM league_members
      WHERE league_id = $1
        AND user_id = $2
    `, [leagueId, userId]);
    }
}
