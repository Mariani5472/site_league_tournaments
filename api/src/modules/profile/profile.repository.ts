import { db } from "../../database/connection";

export class ProfileRepository {
    async findPrivateById(userId: string) {
        const result = await db.query(`SELECT id, email, nickname, avatar_url, banner_url, created_at FROM users WHERE id = $1`, [userId]);
        return result.rows[0];
    }
    async findPublicById(userId: string) {
        const result = await db.query(`SELECT id, nickname, avatar_url, banner_url, created_at FROM users WHERE id = $1`, [userId]);
        return result.rows[0];
    }
    async getPublicStats(userId: string) {
        const result = await db.query(`SELECT COUNT(*) FILTER (WHERE mp.result IS NOT NULL)::int AS matches_played,
          COUNT(*) FILTER (WHERE mp.result = 'win')::int AS wins,
          COUNT(*) FILTER (WHERE mp.result = 'loss')::int AS losses
          FROM match_players mp WHERE mp.user_id = $1`, [userId]);
        return result.rows[0];
    }
    async listPublicLeagues(userId: string) {
        const result = await db.query(`SELECT l.id, l.name, l.description, COUNT(all_members.id)::int AS player_count, l.max_players
          FROM league_members membership JOIN leagues l ON l.id = membership.league_id
          LEFT JOIN league_members all_members ON all_members.league_id = l.id
          WHERE membership.user_id = $1 AND l.visibility = 'public'
          GROUP BY l.id ORDER BY l.created_at DESC, l.id DESC LIMIT 6`, [userId]);
        return result.rows;
    }
    async listPublicRecentMatches(userId: string) {
        const result = await db.query(`SELECT m.id, m.league_id, l.name AS league_name, m.started_at,
          m.finished_at, mp.team_number, mp.result
          FROM match_players mp JOIN matches m ON m.id = mp.match_id
          JOIN leagues l ON l.id = m.league_id AND l.visibility = 'public'
          WHERE mp.user_id = $1 AND m.status = 'finished'
          ORDER BY m.finished_at DESC, m.id DESC LIMIT 6`, [userId]);
        return result.rows;
    }
    async update(userId: string, params: { nickname: string; avatarUrl?: string | null; bannerUrl?: string | null }) {
        const result = await db.query(`UPDATE users SET nickname = $2,
          avatar_url = CASE WHEN $3 THEN $4 ELSE avatar_url END,
          banner_url = CASE WHEN $5 THEN $6 ELSE banner_url END
          WHERE id = $1 RETURNING id, email, nickname, avatar_url, banner_url, created_at`,
        [userId, params.nickname, params.avatarUrl !== undefined, params.avatarUrl ?? null,
          params.bannerUrl !== undefined, params.bannerUrl ?? null]);
        return result.rows[0];
    }
}
