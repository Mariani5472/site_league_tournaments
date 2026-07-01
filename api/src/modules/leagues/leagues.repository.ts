import { db } from "../../database/connection";
import { CreateLeagueDTO, League, ListLeaguesParams } from "./leagues.types";

export class LeaguesRepository {
  async list(params: ListLeaguesParams) {
    const values: unknown[] = [];
    const where: string[] = [];

    let query = `
      SELECT
        l.*,
        lm.role
      FROM league_members lm
      INNER JOIN leagues l
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

    query += `ORDER BY l.created_at DESC`;

    const result = await db.query<League>(
      query,
      values
    );

    return result.rows;
  }

  async findById(id: string): Promise<League | null> {
    const query = `
      SELECT *
      FROM leagues
      WHERE id = $1
    `;

    const result = await db.query<League>(
      query,
      [id]
    );

    return result.rows[0] ?? null;
  }

  async create(data: CreateLeagueDTO): Promise<League> {
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
      data.owner_id,
      data.name,
      data.description ?? null,
      data.visibility,
      data.join_policy,
      data.max_players,
      data.require_riot_account
    ];

    const result = await db.query<League>(
      query,
      values
    );

    return result.rows[0];
  }

  async addMember(params: {
    league_id: string;
    user_id: string;
    role: string;
  }) {
    const query = `
      INSERT INTO league_members (
        league_id,
        user_id,
        role
      )
      VALUES ($1, $2, $3)
    `;

    const values = [
      params.league_id,
      params.user_id,
      params.role
    ];

    await db.query(query, values);
  }

  async getPublicLeagues(search?: string) {
    const query = `
    SELECT *
    FROM leagues
    WHERE 
      visibility = 'public'
      AND (
        name ILIKE '%' || $1 || '%'
        OR description ILIKE '%' || $1 || '%'
      )
    ORDER BY created_at DESC
  `;

    const result = await db.query(query, [search]);

    return result.rows;
  }

  async listLeagueMembers(leagueId: string) {
    const query = `
    SELECT 
      lm.id,
      lm.role,
      u.id as user_id,
      u.nickname,
      ra.game_name,
      ra.tag_line
    FROM league_members lm
    INNER JOIN users u
      ON lm.user_id = u.id
    LEFT JOIN riot_accounts ra
      ON ra.user_id = u.id
    WHERE league_id = $1
  `;

    const result = await db.query(query, [leagueId]);

    return result.rows;
  }

  async findMember(params: {
    leagueId: string;
    userId: string;
  }) {
    const query = `
    SELECT *
    FROM league_members
    WHERE league_id = $1
      AND user_id = $2
  `;

    const result = await db.query(query, [
      params.leagueId,
      params.userId
    ]);

    return result.rows[0];
  }

  async countPlayers(
    leagueId: string
  ) {
    const query = `
    SELECT COUNT(*)::int as total
    FROM league_members
    WHERE league_id = $1
      AND role = 'player'
  `;

    const result =
      await db.query(query, [
        leagueId
      ]);

    return result.rows[0].total;
  }



  async findJoinRequest(params: {
    leagueId: string;
    userId: string;
  }) {
    const query = `
      SELECT *
      FROM league_join_requests
      WHERE league_id = $1
        AND user_id = $2
        AND status = 'pending'
    `;

    const result = await db.query(query, [
      params.leagueId,
      params.userId
    ]);

    return result.rows[0];
  }

  async updateMemberRole(params: {
    leagueId: string;
    userId: string;
    role: string;
  }) {
    const query = `
    UPDATE league_members
    SET role = $3
    WHERE league_id = $1
      AND user_id = $2
  `;

    await db.query(query, [
      params.leagueId,
      params.userId,
      params.role
    ]);
  }

  async removeMember(params: {
    leagueId: string;
    userId: string;
  }) {
    const query = `
      DELETE FROM league_members
      WHERE league_id = $1
        AND user_id = $2
    `;

    await db.query(query, [
      params.leagueId,
      params.userId
    ]);
  }

  async updateLeague(params: {
    leagueId: string;
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

    await db.query(query, [
      params.leagueId,
      params.name ?? null,
      params.description ?? null,
      params.visibility ?? null,
      params.join_policy ?? null,
      params.max_players ?? null,
      params.require_riot_account ?? null
    ]);
  }

  async deleteLeague(leagueId: string) {
    const query = `
      DELETE FROM leagues
      WHERE id = $1
    `;

    await db.query(query, [leagueId]);
  }
}