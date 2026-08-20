import { toCursorPage } from "../../@types/shared/CursorPage";
import { db } from "../../database/connection";
import type { OpsLeagueListParams, OpsUserListParams } from "./ops-directory.types";

export class OpsDirectoryRepository {
    async listUsers(params: OpsUserListParams) {
        const result = await db.query(`
            SELECT u.id, u.nickname, u.avatar_url, u.created_at,
                EXISTS (
                    SELECT 1 FROM platform_roles pr
                    WHERE pr.user_id = u.id AND pr.role = 'super_admin' AND pr.revoked_at IS NULL
                ) AS is_super_admin,
                (SELECT COUNT(*)::int FROM league_members lm WHERE lm.user_id = u.id) AS membership_count
            FROM users u
            WHERE (
                $1 = '' OR u.nickname ILIKE '%' || $1 || '%'
                OR (CASE WHEN $2::uuid IS NULL THEN false ELSE u.id = $2 END)
            )
            AND (
                $3::text IS NULL
                OR ($3 = 'super_admin' AND EXISTS (
                    SELECT 1 FROM platform_roles pr
                    WHERE pr.user_id = u.id AND pr.role = 'super_admin' AND pr.revoked_at IS NULL
                ))
                OR ($3 = 'none' AND NOT EXISTS (
                    SELECT 1 FROM platform_roles pr
                    WHERE pr.user_id = u.id AND pr.revoked_at IS NULL
                ))
            )
            AND (
                $4::uuid IS NULL OR (u.created_at, u.id) < (
                    SELECT created_at, id FROM users WHERE id = $4
                )
            )
            ORDER BY u.created_at DESC, u.id DESC
            LIMIT $5
        `, [
            params.search,
            this.uuidOrNull(params.search),
            params.platformRole ?? null,
            params.cursor ?? null,
            params.limit + 1,
        ]);
        return toCursorPage(result.rows, params.limit);
    }

    async userDetail(userId: string) {
        const user = await db.query(`
            SELECT u.id, u.email, u.nickname, u.avatar_url, u.created_at,
                COALESCE((
                    SELECT array_agg(pr.role ORDER BY pr.role)
                    FROM platform_roles pr
                    WHERE pr.user_id = u.id AND pr.revoked_at IS NULL
                ), ARRAY[]::varchar[]) AS platform_roles,
                (SELECT COUNT(*)::int FROM league_members lm WHERE lm.user_id = u.id) AS membership_count,
                (SELECT COUNT(*)::int FROM league_join_requests r
                    WHERE r.user_id = u.id AND r.status = 'pending') AS pending_request_count,
                (SELECT COUNT(*)::int FROM league_invitations i
                    WHERE i.recipient_id = u.id AND i.status = 'pending') AS pending_invitation_count
            FROM users u WHERE u.id = $1
        `, [userId]);
        if (!user.rowCount) return null;

        const [memberships, activeLobby, matches] = await Promise.all([
            db.query(`
                SELECT l.id AS league_id, l.name AS league_name, l.visibility,
                    lm.role, lm.created_at AS joined_at
                FROM league_members lm JOIN leagues l ON l.id = lm.league_id
                WHERE lm.user_id = $1
                ORDER BY lm.created_at DESC, lm.id DESC LIMIT 100
            `, [userId]),
            db.query(`
                SELECT l.id, l.league_id, league.name AS league_name, l.status, l.created_at
                FROM lobby_players lp JOIN lobbies l ON l.id = lp.lobby_id
                JOIN leagues league ON league.id = l.league_id
                WHERE lp.user_id = $1 AND l.status IN ('waiting', 'in_game')
                ORDER BY l.created_at DESC, l.id DESC LIMIT 1
            `, [userId]),
            db.query(`
                SELECT m.id, m.league_id, l.name AS league_name, m.status,
                    m.finished_at, mp.team_number, mp.result, m.winner_team_number
                FROM match_players mp JOIN matches m ON m.id = mp.match_id
                JOIN leagues l ON l.id = m.league_id
                WHERE mp.user_id = $1
                ORDER BY COALESCE(m.finished_at, m.started_at, m.created_at) DESC, m.id DESC
                LIMIT 10
            `, [userId]),
        ]);
        return {
            ...user.rows[0],
            accountStatus: "active",
            activeLobby: activeLobby.rows[0] ?? null,
            memberships: memberships.rows,
            recentMatches: matches.rows,
        };
    }

    async listLeagues(params: OpsLeagueListParams) {
        const result = await db.query(`
            SELECT l.id, l.name, l.visibility, l.join_policy, l.max_players, l.created_at,
                u.id AS owner_id, u.nickname AS owner_nickname,
                COUNT(DISTINCT lm.id)::int AS member_count,
                CASE WHEN COUNT(DISTINCT active_lobby.id) > 0 THEN 'active' ELSE 'idle' END
                    AS operational_status
            FROM leagues l JOIN users u ON u.id = l.owner_id
            LEFT JOIN league_members lm ON lm.league_id = l.id
            LEFT JOIN lobbies active_lobby ON active_lobby.league_id = l.id
                AND active_lobby.status IN ('waiting', 'in_game')
            WHERE (
                $1 = '' OR l.name ILIKE '%' || $1 || '%' OR u.nickname ILIKE '%' || $1 || '%'
                OR (CASE WHEN $2::uuid IS NULL THEN false ELSE l.id = $2 OR u.id = $2 END)
            )
            AND ($3::text IS NULL OR l.visibility = $3)
            AND ($4::text IS NULL OR
                ($4 = 'active' AND active_lobby.id IS NOT NULL) OR
                ($4 = 'idle' AND NOT EXISTS (
                    SELECT 1 FROM lobbies status_lobby WHERE status_lobby.league_id = l.id
                    AND status_lobby.status IN ('waiting', 'in_game')
                )))
            AND ($5::uuid IS NULL OR (l.created_at, l.id) < (
                SELECT created_at, id FROM leagues WHERE id = $5
            ))
            GROUP BY l.id, u.id
            ORDER BY l.created_at DESC, l.id DESC
            LIMIT $6
        `, [
            params.search,
            this.uuidOrNull(params.search),
            params.visibility ?? null,
            params.operationalStatus ?? null,
            params.cursor ?? null,
            params.limit + 1,
        ]);
        return toCursorPage(result.rows, params.limit);
    }

    async leagueDetail(leagueId: string) {
        const league = await db.query(`
            SELECT l.id, l.name, l.description, l.visibility, l.join_policy,
                l.lobby_creation_policy, l.auto_start_lobby, l.max_players, l.created_at,
                u.id AS owner_id, u.nickname AS owner_nickname, u.avatar_url AS owner_avatar_url,
                (SELECT COUNT(*)::int FROM league_members lm WHERE lm.league_id = l.id) AS member_count,
                (SELECT COUNT(*)::int FROM lobbies lobby WHERE lobby.league_id = l.id
                    AND lobby.status IN ('waiting', 'in_game')) AS active_lobby_count,
                (SELECT COUNT(*)::int FROM matches match WHERE match.league_id = l.id
                    AND match.status = 'in_game') AS active_match_count
            FROM leagues l JOIN users u ON u.id = l.owner_id WHERE l.id = $1
        `, [leagueId]);
        if (!league.rowCount) return null;

        const [members, lobbies, matches] = await Promise.all([
            db.query(`
                SELECT u.id AS user_id, u.nickname, u.avatar_url, lm.role, lm.created_at AS joined_at
                FROM league_members lm JOIN users u ON u.id = lm.user_id
                WHERE lm.league_id = $1
                ORDER BY lm.created_at DESC, lm.id DESC LIMIT 100
            `, [leagueId]),
            db.query(`
                SELECT id, status, max_players, created_by, created_at
                FROM lobbies WHERE league_id = $1
                ORDER BY created_at DESC, id DESC LIMIT 10
            `, [leagueId]),
            db.query(`
                SELECT id, lobby_id, status, winner_team_number, resolution_type,
                    started_at, finished_at, created_at
                FROM matches WHERE league_id = $1
                ORDER BY created_at DESC, id DESC LIMIT 10
            `, [leagueId]),
        ]);
        const detail = league.rows[0];
        return {
            ...detail,
            operationalStatus:
                detail.activeLobbyCount > 0 || detail.activeMatchCount > 0 ? "active" : "idle",
            members: members.rows,
            recentLobbies: lobbies.rows,
            recentMatches: matches.rows,
        };
    }

    private uuidOrNull(value: string) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
            ? value
            : null;
    }
}
