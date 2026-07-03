import { db } from "../../database/connection";
import { CreateLeagueMemberDTO, LeagueMember, ListLeagueMembersParams } from "./leagues.types";

export class LeagueMembersRepository {
  async list(league_id: string, params: ListLeagueMembersParams): Promise<LeagueMember[]> {
    const values: unknown[] = [];
    const where: string[] = [];

    let query = `
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
    `;

    values.push(league_id);
    where.push(`lm.league_id = $${values.length}`);

    if (params.nickname?.length) {
      values.push(params.nickname);
      where.push(`u.nickname = ANY($${values.length})`);
    }

    if (params.user_id?.length) {
      values.push(params.user_id);
      where.push(`lm.user_id = ANY($${values.length})`);
    }

    if (params.role?.length) {
      values.push(params.role);
      where.push(`lm.role = ANY($${values.length})`);
    }

    if (where.length) {
      query += ` WHERE ${where.join(" AND ")}`;
    }

    query += `ORDER BY u.nickname DESC`;

    const result = await db.query<LeagueMember>(query, values);

    return result.rows;
  }

  async count(league_id: string): Promise<number> {
    const query = `
      SELECT COUNT(*)::int as total
      FROM league_members
      WHERE league_id = $1
    `;

    const result = await db.query(query, [
      league_id
    ]);

    return result.rows[0].total;
  }

  async findByLeagueAndUser(league_id: string, user_id: string): Promise<LeagueMember | null> {
    const query = `
      SELECT *
      FROM league_members
      WHERE league_id = $1
      AND user_id = $2
    `;

    const result = await db.query<LeagueMember>(
      query,
      [league_id, user_id]
    );

    return result.rows[0] ?? null;
  }

  async create(league_id: string, user_id: string, params: CreateLeagueMemberDTO): Promise<LeagueMember> {
    const query = `
      INSERT INTO league_members (
        league_id,
        user_id,
        role
      )
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const values = [
      league_id,
      user_id,
      params.role
    ];

    const result = await db.query<LeagueMember>(query, values);
    return result.rows[0];
  }

  async update(league_id: string, user_id: string, params: CreateLeagueMemberDTO): Promise<LeagueMember> {
    const query = `
    UPDATE league_members
    SET role = $3
    WHERE league_id = $1
      AND user_id = $2
    RETURNING *
  `;

    const result = await db.query<LeagueMember>(query, [
      league_id,
      user_id,
      params.role
    ]);

    return result.rows[0];
  }

  async remove(league_id: string, user_id: string) {
    const query = `
      DELETE FROM league_members
      WHERE league_id = $1
        AND user_id = $2
    `;

    await db.query(query, [
      league_id,
      user_id
    ]);
  }
}