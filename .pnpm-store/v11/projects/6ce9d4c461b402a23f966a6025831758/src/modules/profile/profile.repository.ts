import { db } from "../../database/connection";
export class ProfileRepository {
    async findById(userId: string) {
        const query = `
      SELECT
        id,
        email,
        nickname,
        avatar_url,
        banner_url
      FROM users
      WHERE id = $1
    `;
        const result = await db.query(query, [userId]);
        return result.rows[0];
    }
    async update(userId: string, params: {
        nickname: string;
        avatarUrl: string | null;
        bannerUrl: string | null;
    }) {
        const query = `
      UPDATE users
      SET
        nickname = COALESCE($2, nickname),
        avatar_url = COALESCE($3, avatar_url),
        banner_url = COALESCE($4, banner_url)
      WHERE id = $1
      RETURNING *
    `;
        const result = await db.query(query, [
            userId,
            params.nickname,
            params.avatarUrl,
            params.bannerUrl
        ]);
        return result.rows[0];
    }
}
