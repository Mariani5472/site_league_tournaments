import { db } from "../../database/connection";
import { FindOptions } from "../../@types/shared/FindOptions";
import { QueryOptions } from "../../@types/shared/QueryOptions";
import { Lobby } from "./lobbies.types";

export class LobbyTeamSelectionRepository {
    async findLobbyById(lobbyId: string, options: FindOptions = {}) {
        const { executor = db, lock } = options;
        const result = await executor.query<Lobby>(`
            SELECT * FROM lobbies WHERE id = $1
            ${lock === "update" ? "FOR UPDATE" : ""}
        `, [lobbyId]);
        return result.rows[0] ?? null;
    }

    async findLobby(lobbyId: string, leagueId: string, options: FindOptions = {}) {
        const { executor = db, lock } = options;
        const result = await executor.query<Lobby>(`
            SELECT * FROM lobbies
            WHERE id = $1 AND league_id = $2
            ${lock === "update" ? "FOR UPDATE" : ""}
        `, [lobbyId, leagueId]);
        return result.rows[0] ?? null;
    }

    async playerIds(lobbyId: string, options: FindOptions = {}): Promise<string[]> {
        const { executor = db, lock } = options;
        const result = await executor.query<{ userId: string }>(`
            SELECT user_id FROM lobby_players
            WHERE lobby_id = $1 ORDER BY user_id
            ${lock === "update" ? "FOR UPDATE" : ""}
        `, [lobbyId]);
        return result.rows.map(row => row.userId);
    }

    async ratings(lobbyId: string, leagueId: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        const result = await executor.query<{ userId: string; rating: number }>(`
            SELECT lp.user_id,
              COALESCE(COUNT(mp.id) FILTER (WHERE m.id IS NOT NULL AND mp.result='win') * 3
                + COUNT(mp.id) FILTER (WHERE m.id IS NOT NULL), 0)::int rating
            FROM lobby_players lp
            LEFT JOIN match_players mp ON mp.user_id = lp.user_id
            LEFT JOIN matches m ON m.id = mp.match_id AND m.league_id = $2 AND m.status = 'finished'
            WHERE lp.lobby_id = $1 GROUP BY lp.user_id ORDER BY lp.user_id
        `, [lobbyId, leagueId]);
        return result.rows;
    }

    async assignPlayerTeam(lobbyId: string, userId: string, teamNumber: number, options: QueryOptions = {}) {
        const { executor = db } = options;
        await executor.query(`UPDATE lobby_players SET team_number=$3, is_ready=false
            WHERE lobby_id=$1 AND user_id=$2`, [lobbyId, userId, teamNumber]);
    }

    async finishTeamAssignment(lobbyId: string, mode: "random" | "balanced", options: QueryOptions = {}) {
        const { executor = db } = options;
        await executor.query(`UPDATE lobbies SET team_selection_mode=$2,
            team_selection_completed=$3, team_selection_round=team_selection_round+1,
            captain_vote_ends_at=NULL WHERE id=$1`, [lobbyId, mode, mode === "balanced"]);
        await executor.query("DELETE FROM lobby_team_confirmation_votes WHERE lobby_id=$1", [lobbyId]);
    }

    async saveSelectionVote(lobbyId: string, userId: string, mode: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        await executor.query(`INSERT INTO lobby_team_selection_votes (lobby_id,user_id,mode)
            VALUES ($1,$2,$3) ON CONFLICT (lobby_id,user_id)
            DO UPDATE SET mode=EXCLUDED.mode, updated_at=current_timestamp`, [lobbyId, userId, mode]);
    }

    async selectionVoteCount(lobbyId: string, mode: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        const result = await executor.query<{ total: number }>("SELECT COUNT(*)::int total FROM lobby_team_selection_votes WHERE lobby_id=$1 AND mode=$2", [lobbyId, mode]);
        return Number(result.rows[0].total);
    }

    async startPlayerPicks(lobbyId: string, deadline: Date, options: QueryOptions = {}) {
        const { executor = db } = options;
        await executor.query(`UPDATE lobbies SET team_selection_mode='player_picks',
            team_selection_completed=false, draft_captain_1=NULL,draft_captain_2=NULL,
            draft_pick_index=0, captain_vote_ends_at=$2
            WHERE id=$1`, [lobbyId, deadline]);
        await executor.query("DELETE FROM lobby_draft_picks WHERE lobby_id=$1", [lobbyId]);
        await executor.query("DELETE FROM lobby_captain_votes WHERE lobby_id=$1", [lobbyId]);
        await executor.query("UPDATE lobby_players SET is_ready=false WHERE lobby_id=$1", [lobbyId]);
    }

    async saveConfirmation(lobbyId: string, userId: string, decision: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        await executor.query(`INSERT INTO lobby_team_confirmation_votes (lobby_id,user_id,decision)
            VALUES ($1,$2,$3) ON CONFLICT (lobby_id,user_id)
            DO UPDATE SET decision=EXCLUDED.decision, updated_at=current_timestamp`, [lobbyId, userId, decision]);
    }

    async confirmationCount(lobbyId: string, decision: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        const result = await executor.query<{ total: number }>("SELECT COUNT(*)::int total FROM lobby_team_confirmation_votes WHERE lobby_id=$1 AND decision=$2", [lobbyId, decision]);
        return Number(result.rows[0].total);
    }

    async acceptRandomTeams(lobbyId: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        await executor.query("UPDATE lobbies SET team_selection_completed=true WHERE id=$1", [lobbyId]);
        await executor.query("UPDATE lobby_players SET is_ready=true WHERE lobby_id=$1", [lobbyId]);
    }

    async saveCaptainVote(lobbyId: string, voterId: string, candidateId: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        await executor.query(`INSERT INTO lobby_captain_votes (lobby_id,voter_id,candidate_id)
            VALUES ($1,$2,$3) ON CONFLICT (lobby_id,voter_id)
            DO UPDATE SET candidate_id=EXCLUDED.candidate_id, updated_at=current_timestamp`, [lobbyId, voterId, candidateId]);
    }

    async captainWinners(lobbyId: string, options: QueryOptions = {}): Promise<string[]> {
        const { executor = db } = options;
        const result = await executor.query<{ userId: string }>(`SELECT lp.user_id,
            COUNT(cv.voter_id)::int votes FROM lobby_players lp
            LEFT JOIN lobby_captain_votes cv ON cv.lobby_id=lp.lobby_id AND cv.candidate_id=lp.user_id
            WHERE lp.lobby_id=$1 GROUP BY lp.user_id ORDER BY votes DESC, random() LIMIT 2`, [lobbyId]);
        return result.rows.map(row => row.userId);
    }

    async findDueCaptainElections(now: Date, limit: number): Promise<string[]> {
        const result = await db.query<{ id: string }>(`
            SELECT id FROM lobbies
            WHERE status = 'waiting'
              AND team_selection_mode = 'player_picks'
              AND draft_captain_1 IS NULL
              AND draft_captain_2 IS NULL
              AND captain_vote_ends_at IS NOT NULL
              AND captain_vote_ends_at <= $1
            ORDER BY captain_vote_ends_at, id
            LIMIT $2
        `, [now, limit]);
        return result.rows.map(row => row.id);
    }

    async initializeDraft(lobbyId: string, captain1: string, captain2: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        await executor.query(`UPDATE lobbies SET draft_captain_1=$2,draft_captain_2=$3,
            captain_vote_ends_at=NULL,draft_pick_index=0 WHERE id=$1`, [lobbyId, captain1, captain2]);
        await executor.query("DELETE FROM lobby_draft_picks WHERE lobby_id=$1", [lobbyId]);
        await executor.query(`INSERT INTO lobby_draft_picks (lobby_id,user_id,team_number,pick_number)
            VALUES ($1,$2,1,-2),($1,$3,2,-1)`, [lobbyId, captain1, captain2]);
        await executor.query("UPDATE lobby_players SET is_ready=false WHERE lobby_id=$1", [lobbyId]);
        await this.assignPlayerTeam(lobbyId, captain1, 1, options);
        await this.assignPlayerTeam(lobbyId, captain2, 2, options);
    }

    async isPicked(lobbyId: string, userId: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        const result = await executor.query("SELECT 1 FROM lobby_draft_picks WHERE lobby_id=$1 AND user_id=$2", [lobbyId, userId]);
        return Boolean(result.rowCount);
    }

    async addDraftPick(lobbyId: string, userId: string, team: number, pickIndex: number, options: QueryOptions = {}) {
        const { executor = db } = options;
        await executor.query("INSERT INTO lobby_draft_picks (lobby_id,user_id,team_number,pick_number) VALUES ($1,$2,$3,$4)", [lobbyId, userId, team, pickIndex]);
        await this.assignPlayerTeam(lobbyId, userId, team, options);
    }

    async updateDraftProgress(lobbyId: string, nextIndex: number, completed: boolean, options: QueryOptions = {}) {
        const { executor = db } = options;
        await executor.query("UPDATE lobbies SET draft_pick_index=$2, team_selection_completed=$3 WHERE id=$1", [lobbyId, nextIndex, completed]);
    }
}
