import { db } from "../../database/connection";
import { CreateLeagueDTO, League, ListLeaguesParams } from "./leagues.types";
import { FindOptions } from "../../@types/shared/FindOptions";
import { QueryOptions } from "../../@types/shared/QueryOptions";
export class LeaguesRepository {
    async list(params: ListLeaguesParams) {
        const values: unknown[] = [];
        const where: string[] = [];
        let query = `
      SELECT DISTINCT
        l.*
      FROM leagues l
      LEFT JOIN league_members lm
        ON l.id = lm.league_id
    `;
        if (params.membership?.length) {
            values.push(params.userId);
            where.push(`lm.user_id = $${values.length}`);
        }
        if (params.visibility?.length) {
            values.push(params.visibility);
            where.push(`l.visibility = ANY($${values.length})`);
        }
        if (params.search?.length) {
            values.push(`%${params.search}%`);
            where.push(`l.name ILIKE $${values.length}`);
        }
        if (where.length) {
            query += ` WHERE ${where.join(" AND ")}`;
        }
        query += ` ORDER BY l.created_at DESC`;
        const result = await db.query<League>(query, values);
        return result.rows;
    }
    async discover(userId: string, search?: string) {
        const query = `
    SELECT
      l.*,
      COUNT(lm.id)::int AS player_count

    FROM leagues l

    LEFT JOIN league_members lm
      ON lm.league_id = l.id

    WHERE l.visibility = 'public'

      AND NOT EXISTS (
        SELECT 1
        FROM league_members user_members
        WHERE user_members.league_id = l.id
          AND user_members.user_id = $1
      )

      AND (
        $2::text IS NULL
        OR l.name ILIKE '%' || $2 || '%'
        OR l.description ILIKE '%' || $2 || '%'
      )

    GROUP BY l.id

    ORDER BY l.created_at DESC
  `;
        const result = await db.query<League>(query, [
            userId,
            search || null,
        ]);
        return result.rows;
    }
    async listMine(userId: string) {
        const query = `
    SELECT
      l.*,
      COUNT(all_members.id)::int AS player_count
    FROM leagues l

    INNER JOIN league_members user_members
      ON user_members.league_id = l.id
      AND user_members.user_id = $1

    LEFT JOIN league_members all_members
      ON all_members.league_id = l.id

    GROUP BY l.id
    ORDER BY l.created_at DESC
  `;
        const result = await db.query<League>(query, [userId]);
        return result.rows;
    }
    async findById(leagueId: string, options: FindOptions = {}): Promise<League | null> {
        const { executor = db, lock, } = options;
        const query = `
      SELECT *
      FROM leagues
      WHERE id = $1
      ${lock === "update" ? "FOR UPDATE" : ""}
    `;
        const result = await executor.query<League>(query, [leagueId]);
        return result.rows[0] ?? null;
    }
    async create(params: CreateLeagueDTO): Promise<League> {
        const query = `
      INSERT INTO leagues (
        owner_id,
        name,
        description,
        visibility,
        join_policy,
        max_players
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6
      )
      RETURNING *
    `;
        const values = [
            params.ownerId,
            params.name,
            params.description ?? null,
            params.visibility,
            params.joinPolicy,
            params.maxPlayers
        ];
        const result = await db.query<League>(query, values);
        return result.rows[0];
    }
    async update(leagueId: string, params: {
        name?: string;
        description?: string;
        visibility?: string;
        joinPolicy?: string;
        maxPlayers?: number;
    }) {
        const query = `
      UPDATE leagues
      SET
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        visibility = COALESCE($4, visibility),
        join_policy = COALESCE($5, join_policy),
        max_players = COALESCE($6, max_players)
      WHERE id = $1
    `;
        await db.query<League>(query, [
            leagueId,
            params.name ?? null,
            params.description ?? null,
            params.visibility ?? null,
            params.joinPolicy ?? null,
            params.maxPlayers ?? null
        ]);
    }
    async remove(leagueId: string) {
        const query = `
      DELETE FROM leagues
      WHERE id = $1
    `;
        await db.query(query, [leagueId]);
    }
    async updateOwner(leagueId: string, ownerId: string, options: QueryOptions = {}): Promise<void> {
        const { executor = db } = options;
        await executor.query(`
      UPDATE leagues
      SET owner_id = $2
      WHERE id = $1
    `, [leagueId, ownerId]);
    }
}
