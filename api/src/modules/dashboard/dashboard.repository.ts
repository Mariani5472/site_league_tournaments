import { db } from "../../database/connection";
import type { DashboardActionRow, DashboardResponse } from "./dashboard.types";

export class DashboardRepository {
    async getSummary(userId: string): Promise<DashboardResponse["summary"]> {
        const result = await db.query(`SELECT
            (SELECT COUNT(*)::int FROM league_members WHERE user_id = $1) AS league_count,
            COUNT(*) FILTER (WHERE mp.result IS NOT NULL)::int AS matches_played,
            COUNT(*) FILTER (WHERE mp.result = 'win')::int AS wins,
            COUNT(*) FILTER (WHERE mp.result = 'loss')::int AS losses
          FROM match_players mp WHERE mp.user_id = $1`, [userId]);
        return result.rows[0];
    }

    async listRecentLeagues(userId: string): Promise<DashboardResponse["recentLeagues"]> {
        const result = await db.query(`SELECT l.id, l.name, l.description, l.max_players, lm.role,
            COUNT(all_members.id)::int AS player_count
          FROM league_members lm JOIN leagues l ON l.id = lm.league_id
          LEFT JOIN league_members all_members ON all_members.league_id = l.id
          WHERE lm.user_id = $1 GROUP BY l.id, lm.role
          ORDER BY l.created_at DESC, l.id DESC LIMIT 4`, [userId]);
        return result.rows;
    }

    async listActions(userId: string): Promise<DashboardActionRow[]> {
        const result = await db.query<DashboardActionRow>(`WITH user_actions AS (
            SELECT lp.id::text AS id, 'lobby_waiting'::text AS type, l.id AS league_id,
              l.name AS league_name, lob.id AS lobby_id, NULL::uuid AS match_id,
              NULL::int AS count, 1 AS priority, lob.created_at AS occurred_at
            FROM lobby_players lp JOIN lobbies lob ON lob.id = lp.lobby_id
            JOIN leagues l ON l.id = lob.league_id
            WHERE lp.user_id = $1 AND lob.status = 'waiting'
            UNION ALL
            SELECT mp.id::text, 'vote_pending', l.id, l.name, m.lobby_id, m.id,
              NULL::int, 2, m.started_at
            FROM match_players mp JOIN matches m ON m.id = mp.match_id
            JOIN leagues l ON l.id = m.league_id
            LEFT JOIN match_votes mv ON mv.match_id = m.id AND mv.voter_id = $1
            WHERE mp.user_id = $1 AND m.status = 'in_game' AND mv.id IS NULL
            UNION ALL
            SELECT l.id::text, 'admin_requests', l.id, l.name, NULL::uuid, NULL::uuid,
              COUNT(ljr.id)::int, 3, MAX(ljr.created_at)
            FROM league_members lm JOIN leagues l ON l.id = lm.league_id
            JOIN league_join_requests ljr ON ljr.league_id = l.id AND ljr.status = 'pending'
            WHERE lm.user_id = $1 AND lm.role IN ('owner', 'admin') GROUP BY l.id, l.name
          ) SELECT * FROM user_actions ORDER BY priority, occurred_at DESC LIMIT 8`, [userId]);
        return result.rows;
    }

    async listRecentMatches(userId: string): Promise<DashboardResponse["recentMatches"]> {
        const result = await db.query(`SELECT m.id, m.league_id, l.name AS league_name, m.status, m.started_at,
            m.finished_at, m.winner_team_number, mp.team_number, mp.result
          FROM match_players mp JOIN matches m ON m.id = mp.match_id
          JOIN leagues l ON l.id = m.league_id WHERE mp.user_id = $1
          ORDER BY COALESCE(m.finished_at, m.started_at) DESC, m.id DESC LIMIT 5`, [userId]);
        return result.rows;
    }
}
