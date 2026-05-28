import { db } from "../../database/connection";

export class ProfileRepository {
  async findById(userId: string) {
    const query = `
      SELECT
        id,
        email,
        nickname,
        avatar_url,
        banner_url,
        riot_game_name,
        riot_tag_line
      FROM users
      WHERE id = $1
    `;

    const result = await db.query(query, [userId]);

    return result.rows[0];
  }

  async update(params: {
    userId: string;
    nickname: string;
    avatar_url: string | null;
    banner_url: string | null;
  }) {
    const query = `
      UPDATE users
      SET
        nickname = COALESCE($2, nickname),
        avatar_url = COALESCE($3, avatar_url)
        banner_url = COALESCE($4, banner_url)
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [
      params.userId,
      params.nickname,
      params.avatar_url,
      params.banner_url
    ]);

    return result.rows[0];
  }
}