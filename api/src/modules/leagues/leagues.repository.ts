import { db } from "../../database/connection";
import { CreateLeagueDTO, League, ListLeaguesParams } from "./leagues.types";
import { FindOptions } from "../../@types/shared/FindOptions";
import { QueryOptions } from "../../@types/shared/QueryOptions";
import { CursorParams, toCursorPage } from "../../@types/shared/CursorPage";
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
    async discover(userId: string, params: CursorParams & { search?: string }) {
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
      AND ($3::uuid IS NULL OR l.id < $3)

      AND (
        $2::text IS NULL
        OR l.name ILIKE '%' || $2 || '%'
        OR l.description ILIKE '%' || $2 || '%'
      )

    GROUP BY l.id

    ORDER BY l.id DESC LIMIT $4
  `;
        const result = await db.query<League>(query, [
            userId,
            params.search || null, params.cursor ?? null, params.limit + 1,
        ]);
        return toCursorPage(result.rows, params.limit);
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
      SELECT l.*,
        (SELECT COUNT(*)::int FROM league_members lm WHERE lm.league_id = l.id) AS player_count
      FROM leagues l
      WHERE l.id = $1
      ${lock === "update" ? "FOR UPDATE OF l" : ""}
    `;
        const result = await executor.query<League>(query, [leagueId]);
        return result.rows[0] ?? null;
    }
    async create(params: CreateLeagueDTO, options: QueryOptions = {}): Promise<League> {
        const { executor = db } = options;
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
        const result = await executor.query<League>(query, values);
        return result.rows[0];
    }
    async update(leagueId: string, params: {
        name?: string;
        description?: string | null;
        visibility?: string;
        joinPolicy?: string;
        maxPlayers?: number;
        lobbyCreationPolicy?: "admins" | "members";
        autoStartLobby?: boolean;
    }, options: QueryOptions = {}): Promise<League> {
        const { executor = db } = options;
        const query = `
      UPDATE leagues
      SET
        name = COALESCE($2, name),
        description = CASE WHEN $3::boolean THEN $4 ELSE description END,
        visibility = COALESCE($5, visibility),
        join_policy = COALESCE($6, join_policy),
        max_players = COALESCE($7, max_players),
        lobby_creation_policy = COALESCE($8, lobby_creation_policy),
        auto_start_lobby = COALESCE($9, auto_start_lobby)
      WHERE id = $1
      RETURNING *
    `;
        const result = await executor.query<League>(query, [
            leagueId,
            params.name ?? null,
            Object.hasOwn(params, "description"),
            params.description ?? null,
            params.visibility ?? null,
            params.joinPolicy ?? null,
            params.maxPlayers ?? null,
            params.lobbyCreationPolicy ?? null,
            params.autoStartLobby ?? null
        ]);
        return result.rows[0];
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
