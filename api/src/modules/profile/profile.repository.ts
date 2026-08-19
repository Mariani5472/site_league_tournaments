import { db } from "../../database/connection";
import { toCursorPage, type CursorParams } from "../../@types/shared/CursorPage";

export class ProfileRepository {
    async discover(requesterId: string, params: CursorParams & { search: string }) {
        const result = await db.query(`SELECT u.id, u.nickname, u.avatar_url,
          COALESCE(array_agg(DISTINCT public_leagues.name) FILTER (WHERE public_leagues.id IS NOT NULL), '{}') AS public_leagues,
          COUNT(DISTINCT common_members.league_id)::int AS common_public_league_count
          FROM users u
          LEFT JOIN league_members public_members ON public_members.user_id = u.id
          LEFT JOIN leagues public_leagues ON public_leagues.id = public_members.league_id AND public_leagues.visibility = 'public'
          LEFT JOIN league_members common_members ON common_members.league_id = public_leagues.id AND common_members.user_id = $1
          WHERE u.id <> $1 AND ($2 = '' OR u.nickname ILIKE '%' || $2 || '%')
            AND ($3::uuid IS NULL OR u.id < $3)
          GROUP BY u.id
          ORDER BY u.id DESC LIMIT $4`, [requesterId, params.search, params.cursor ?? null, params.limit + 1]);
        return toCursorPage(result.rows, params.limit);
    }
    async findPrivateById(userId: string) {
        const result = await db.query(`SELECT id, email, nickname, avatar_url, banner_url, created_at FROM users WHERE id = $1`, [userId]);
        return result.rows[0];
    }
    async findPublicById(userId: string) {
        const result = await db.query(`SELECT id, nickname, avatar_url, banner_url, created_at FROM users WHERE id = $1`, [userId]);
        return result.rows[0];
    }
    async getPublicStats(userId: string) {
        const result = await db.query(`WITH ordered_results AS (
          SELECT mp.result::text AS result,
            ROW_NUMBER() OVER (ORDER BY m.finished_at DESC, m.id DESC) AS result_order,
            LAG(mp.result::text) OVER (ORDER BY m.finished_at DESC, m.id DESC) AS previous_result
          FROM match_players mp
          JOIN matches m ON m.id = mp.match_id
          WHERE mp.user_id = $1 AND m.status = 'finished' AND mp.result IS NOT NULL
        ), streak_groups AS (
          SELECT result, result_order,
            SUM(CASE WHEN previous_result IS NULL OR previous_result <> result THEN 1 ELSE 0 END)
              OVER (ORDER BY result_order) AS streak_group
          FROM ordered_results
        )
        SELECT COUNT(*)::int AS matches_played,
          (COUNT(*) FILTER (WHERE result = 'win'))::int AS wins,
          (COUNT(*) FILTER (WHERE result = 'loss'))::int AS losses,
          COALESCE(
            ARRAY_AGG(result ORDER BY result_order) FILTER (WHERE result_order <= 5),
            ARRAY[]::text[]
          ) AS recent_form,
          MAX(result) FILTER (WHERE result_order = 1) AS current_streak_result,
          (COUNT(*) FILTER (WHERE streak_group = 1))::int AS current_streak
        FROM streak_groups`, [userId]);
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
