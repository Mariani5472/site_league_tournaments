import { db } from "../../database/connection";
import { CreateLeagueDTO } from "./leagues.types";

export class LeaguesRepository {
  async create(data: CreateLeagueDTO) {
    const query = `
      INSERT INTO leagues (
        id,
        owner_id,
        name,
        description,
        visibility,
        join_policy,
        max_players
      )
      VALUES (
        gen_random_uuid(),
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
      data.ownerId,
      data.name,
      data.description ?? null,
      data.visibility,
      data.joinPolicy,
      data.maxPlayers
    ];

    const result = await db.query(
      query,
      values
    );

    return result.rows[0];
  }

  async addMember(params: {
    leagueId: string;
    userId: string;
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
      params.leagueId,
      params.userId,
      params.role
    ];

    await db.query(query, values);
  }

  async findById(id: string) {
    const query = `
      SELECT *
      FROM leagues
      WHERE id = $1
    `;

    const result = await db.query(
      query,
      [id]
    );

    return result.rows[0];
  }

  async listPublic() {
    const query = `
    SELECT *
    FROM leagues
    WHERE visibility = 'public'
    ORDER BY created_at DESC
  `;

    const result = await db.query(query);

    return result.rows;
  }

  async listUserLeagues(userId: string) {
    const query = `
      SELECT
        l.*,
        lm.role,
        lm.wins,
        lm.losses
      FROM league_members lm

      INNER JOIN leagues l
        ON l.id = lm.league_id

      WHERE lm.user_id = $1

      ORDER BY l.created_at DESC
    `;

    const result = await db.query(
      query,
      [userId]
    );

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

    const result =
      await db.query(query, [
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

  async createJoinRequest(params: {
    leagueId: string;
    userId: string;
  }) {
    const query = `
      INSERT INTO league_join_requests (
        id,
        league_id,
        user_id,
        status
      )
      VALUES (
        gen_random_uuid(),
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

  async findRequestById(requestId: string) {
    const query = `
    SELECT *
    FROM league_join_requests
    WHERE id = $1
  `;

    const result = await db.query(query, [requestId]);

    return result.rows[0];
  }

  async approveRequest(requestId: string) {
    const query = `
      UPDATE league_join_requests
      SET status = 'approved'
      WHERE id = $1
    `;

    await db.query(query, [
      requestId
    ]);
  }

  async rejectRequest(requestId: string) {
    const query = `
      UPDATE league_join_requests
      SET status = 'approved'
      WHERE id = $1
    `;

    await db.query(query, [
      requestId
    ]);
  }
}