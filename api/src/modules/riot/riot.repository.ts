import { db } from "../../database/connection";

export class RiotRepository {
  async findByUserId(userId: string) {
    const query = `
      SELECT 
        id,
        user_id,
        game_name,
        tag_line,
        puuid,
        region,
        linked_at
      FROM riot_accounts
      WHERE user_id = $1
    `;

    const result = await db.query(query, [userId]);
    return result.rows[0];
  };

  async findByPuuid(puuid: string) {
    const query = `
      SELECT *
      FROM riot_accounts
      WHERE puuid = $1
    `;

    const result = await db.query(query, [puuid]);
    return result.rows[0];
  };

  async create(params: {
    userId: string;
    gameName: string;
    tagLine: string;
    puuid: string;
    region: string;
  }) {
    const query = `
      INSERT INTO riot_accounts (
        id,
        user_id,
        game_name,
        tag_line,
        puuid,
        region
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        $5
      )
      RETURNING *
    `;

    const result = await db.query(query,
      [
        params.userId,
        params.gameName,
        params.tagLine,
        params.puuid,
        params.region
      ]
    );

    return result.rows[0];
  }

  async deleteByUserId(userId: string) {
    const query = `
      DELETE FROM riot_accounts
      WHERE user_id = $1
    `;

    await db.query(
      query,
      [userId]
    );
  }
}