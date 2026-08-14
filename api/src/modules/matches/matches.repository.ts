import { PoolClient } from "pg";
import { db } from "../../database/connection";
import { QueryOptions } from "../../@types/shared/QueryOptions";
import { CursorParams, toCursorPage } from "../../@types/shared/CursorPage";
export class MatchesRepository {
    async findForUpdate(matchId: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        const result = await executor.query(`SELECT m.* FROM matches m
            JOIN lobbies l ON l.id = m.lobby_id AND l.league_id = m.league_id
            WHERE m.id = $1 FOR UPDATE OF m`, [matchId]);
        return result.rows[0] ?? null;
    }

    async isParticipant(matchId: string, userId: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        const result = await executor.query("SELECT 1 FROM match_players WHERE match_id = $1 AND user_id = $2", [matchId, userId]);
        return Boolean(result.rowCount);
    }

    async saveVote(matchId: string, userId: string, winnerTeam: number, options: QueryOptions = {}) {
        const { executor = db } = options;
        await executor.query(`INSERT INTO match_votes (match_id, voter_id, winner_team)
            VALUES ($1, $2, $3) ON CONFLICT (match_id, voter_id)
            DO UPDATE SET winner_team = EXCLUDED.winner_team, updated_at = current_timestamp`, [matchId, userId, winnerTeam]);
    }

    async voteCounts(matchId: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        const result = await executor.query("SELECT winner_team, COUNT(*)::int total FROM match_votes WHERE match_id = $1 GROUP BY winner_team", [matchId]);
        return result.rows;
    }

    async playerCount(matchId: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        const result = await executor.query("SELECT COUNT(*)::int total FROM match_players WHERE match_id = $1", [matchId]);
        return Number(result.rows[0].total);
    }
    async listByLeague(leagueId: string, pagination: CursorParams) {
        const result = await db.query(`
      SELECT m.*,
        COALESCE(json_agg(json_build_object(
          'user_id', mp.user_id, 'nickname', COALESCE(mp.nickname_snapshot, u.nickname),
          'team_number', mp.team_number, 'result', mp.result
        ) ORDER BY mp.team_number, COALESCE(mp.nickname_snapshot, u.nickname)) FILTER (WHERE mp.id IS NOT NULL), '[]') AS players,
        (SELECT COUNT(*)::int FROM match_votes mv WHERE mv.match_id = m.id) AS vote_count
      FROM matches m
      LEFT JOIN match_players mp ON mp.match_id = m.id
      LEFT JOIN users u ON u.id = mp.user_id
      WHERE m.league_id = $1 AND ($2::uuid IS NULL OR m.id < $2)
      GROUP BY m.id ORDER BY m.id DESC LIMIT $3`, [leagueId, pagination.cursor ?? null, pagination.limit + 1]);
        return toCursorPage(result.rows, pagination.limit);
    }
    async details(matchId: string, userId: string) {
        const result = await db.query(`
      SELECT m.*,
        COALESCE(json_agg(json_build_object(
          'user_id', mp.user_id, 'nickname', COALESCE(mp.nickname_snapshot, u.nickname),
          'team_number', mp.team_number, 'result', mp.result
        ) ORDER BY mp.team_number, COALESCE(mp.nickname_snapshot, u.nickname)) FILTER (WHERE mp.id IS NOT NULL), '[]') AS players,
        (SELECT json_build_object(
          'team_1', COUNT(*) FILTER (WHERE winner_team = 1),
          'team_2', COUNT(*) FILTER (WHERE winner_team = 2),
          'total', COUNT(*)
        ) FROM match_votes mv WHERE mv.match_id = m.id) AS votes,
        (SELECT winner_team FROM match_votes mv WHERE mv.match_id = m.id AND mv.voter_id = $2) AS my_vote
      FROM matches m JOIN lobbies l ON l.id = m.lobby_id AND l.league_id = m.league_id
      LEFT JOIN match_players mp ON mp.match_id = m.id
      LEFT JOIN users u ON u.id = mp.user_id WHERE m.id = $1 GROUP BY m.id`, [matchId, userId]);
        return result.rows[0] ?? null;
    }
    async standings(leagueId: string) {
        const result = await db.query(`
      SELECT u.id AS user_id, u.nickname, u.avatar_url,
        COUNT(*) FILTER (WHERE mp.result IS NOT NULL)::int AS games_played,
        COUNT(*) FILTER (WHERE mp.result = 'win')::int AS wins,
        COUNT(*) FILTER (WHERE mp.result = 'loss')::int AS losses
      FROM league_members lm JOIN users u ON u.id = lm.user_id
      LEFT JOIN match_players mp ON mp.user_id = u.id
        AND EXISTS (SELECT 1 FROM matches m WHERE m.id = mp.match_id AND m.league_id = $1 AND m.status = 'finished')
      WHERE lm.league_id = $1 AND lm.role IN ('owner', 'admin', 'player')
      GROUP BY u.id ORDER BY wins DESC, losses ASC,
        CASE WHEN COUNT(*) FILTER (WHERE mp.result IS NOT NULL) > 0
          THEN COUNT(*) FILTER (WHERE mp.result = 'win')::numeric / COUNT(*) FILTER (WHERE mp.result IS NOT NULL) ELSE 0 END DESC,
        u.nickname ASC`, [leagueId]);
        return result.rows.map((row, index) => ({
            ...row, position: index + 1,
            winRate: row.gamesPlayed > 0 ? row.wins / row.gamesPlayed : 0,
        }));
    }
    async finalize(client: PoolClient, matchId: string, winner: number, type: "vote" | "admin", actorId?: string, reason?: string) {
        const updated = await client.query(`
      UPDATE matches SET status = 'finished', winner_team_number = $2,
        resolution_type = $3, resolved_by = $4, resolution_reason = $5,
        finished_at = current_timestamp
      WHERE id = $1 AND status = 'in_game' RETURNING *`, [matchId, winner, type, actorId ?? null, reason ?? null]);
        if (!updated.rowCount)
            return null;
        await client.query(`UPDATE match_players SET result = CASE WHEN team_number = $2 THEN 'win' ELSE 'loss' END WHERE match_id = $1`, [matchId, winner]);
        await client.query(`UPDATE lobbies SET status = 'finished'
      WHERE id = (SELECT lobby_id FROM matches WHERE id = $1) AND status = 'in_game'`, [matchId]);
        return updated.rows[0];
    }
}
