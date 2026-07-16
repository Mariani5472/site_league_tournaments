import { db } from "../../database/connection";
import { CreateLeagueDTO, League, ListLeaguesParams } from "./leagues.types";

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
      values.push(params.user_id);
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

    const result = await db.query<League>(
      query,
      values
    );

    return result.rows;
  }

  async discover(
    user_id: string,
    search?: string
  ) {
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

    const result = await db.query<League>(
      query,
      [
        user_id,
        search || null,
      ]
    );

    return result.rows;
  }

  async listMine(user_id: string) {
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

    const result = await db.query<League>(query, [user_id]);

    return result.rows;
  }

  async findById(league_id: string): Promise<League | null> {
    const query = `
      SELECT *
      FROM leagues
      WHERE id = $1
    `;

    const result = await db.query<League>(
      query,
      [league_id]
    );

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
        max_players,
        require_riot_account
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
      )
      RETURNING *
    `;

    const values = [
      params.owner_id,
      params.name,
      params.description ?? null,
      params.visibility,
      params.join_policy,
      params.max_players,
      params.require_riot_account
    ];

    const result = await db.query<League>(
      query,
      values
    );

    return result.rows[0];
  }

  async update(league_id: string, params: {
    name?: string;
    description?: string;
    visibility?: string;
    join_policy?: string;
    max_players?: number;
    require_riot_account?: boolean;
  }) {
    const query = `
      UPDATE leagues
      SET
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        visibility = COALESCE($4, visibility),
        join_policy = COALESCE($5, join_policy),
        max_players = COALESCE($6, max_players),
        require_riot_account = COALESCE($7, require_riot_account)
      WHERE id = $1
    `;

    await db.query<League>(query, [
      league_id,
      params.name ?? null,
      params.description ?? null,
      params.visibility ?? null,
      params.join_policy ?? null,
      params.max_players ?? null,
      params.require_riot_account ?? null
    ]);
  }

  async remove(league_id: string) {
    const query = `
      DELETE FROM leagues
      WHERE id = $1
    `;

    await db.query(query, [league_id]);
  }
}