import { db } from "../../database/connection";
import { CreateLobbyDTO, Lobby, LobbyPlayer, LobbyPlayerProfile } from "./lobbies.types";
import { FindOptions } from "../../@types/shared/FindOptions";
import { QueryOptions } from "../../@types/shared/QueryOptions";
export class LobbiesRepository {
    async findById(lobbyId: string, options: FindOptions = {}) {
        const { executor = db, lock } = options;
        const query = `
      SELECT *
      FROM lobbies
      WHERE id = $1
      ${lock === "update" ? "FOR UPDATE" : ""}
    `;
        const result = await executor.query<Lobby>(query, [lobbyId]);
        return result.rows[0];
    }
    async create(leagueId: string, userId: string, data: CreateLobbyDTO) {
        const query = `
      INSERT INTO lobbies (
        league_id,
        created_by,
        max_players
      )
      VALUES ($1, $2, $3)
      RETURNING *
    `;
        const result = await db.query<Lobby>(query, [
            leagueId,
            userId,
            data.maxPlayers
        ]);
        return result.rows[0];
    }
    async addPlayer(lobbyId: string, userId: string, teamNumber: number, options: QueryOptions = {}) {
        const { executor = db } = options;
        const query = `
      INSERT INTO lobby_players (
        lobby_id,
        user_Id,
        team_number
      )
      VALUES ($1, $2, $3)
      RETURNING *
    `;
        const result = await executor.query<LobbyPlayer>(query, [
            lobbyId,
            userId,
            teamNumber,
        ]);
        return result.rows[0];
    }
    async updatePlayerTeam(lobbyId: string, userId: string, teamNumber: number) {
        const query = `
      UPDATE lobby_players
      SET team_number = $1,
      is_ready = FALSE
      WHERE lobby_id = $2
      AND user_id = $3
      RETURNING * 
    `;
        const result = await db.query(query, [
            teamNumber,
            lobbyId,
            userId,
        ]);
        return result.rows[0];
    }
    async updatePlayerReady(lobbyId: string, userId: string, isReady: boolean) {
        const query = `
      UPDATE lobby_players
      SET is_ready = $1
      WHERE lobby_id = $2
      AND user_id = $3
      RETURNING * 
    `;
        const result = await db.query<LobbyPlayer>(query, [
            isReady,
            lobbyId,
            userId,
        ]);
        return result.rows[0];
    }
    async removePlayer(lobbyId: string, userId: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        const query = `
      DELETE FROM lobby_players
      WHERE lobby_id = $1
      AND user_id = $2
      RETURNING *
    `;
        const result = await executor.query<LobbyPlayer>(query, [
            lobbyId,
            userId,
        ]);
        return result.rows[0];
    }
    async remove(lobbyId: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        await executor.query("DELETE FROM lobbies WHERE id = $1", [lobbyId]);
    }
    async countPlayersByTeam(lobbyId: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        const query = `
      SELECT
        team_number,
        COUNT(*) as total
      FROM lobby_players
      WHERE lobby_id = $1
      GROUP BY team_number
    `;
        const result = await executor.query(query, [lobbyId]);
        return result.rows;
    }
    async findActiveLobbyByPlayer(userId: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        const query = `
      SELECT l.* 
      FROM lobbies l
      INNER JOIN lobby_players lp ON lp.lobby_id = l.id
      WHERE lp.user_id = $1
        AND l.status IN ('in_game', 'waiting')
      LIMIT 1;
    `;
        const result = await executor.query<Lobby>(query, [userId]);
        return result.rows[0];
    }
    async findPlayerInLobby(lobbyId: string, userId: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        const query = `
      SELECT *
      FROM lobby_players
      WHERE lobby_id = $1
      AND user_id = $2
    `;
        const result = await executor.query<LobbyPlayer>(query, [lobbyId, userId]);
        return result.rows[0];
    }
    async getLobbyPlayers(lobbyId: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        const query = `
      SELECT 
        lp.*,
        u.nickname,
        u.avatar_url
      FROM lobby_players lp
      INNER JOIN users u ON u.id = lp.user_id
      WHERE lobby_id = $1
    `;
        const result = await executor.query<LobbyPlayerProfile>(query, [lobbyId]);
        return result.rows;
    }
    async findWaitingLobbyByLeague(leagueId: string) {
        const query = `
      SELECT *
      FROM lobbies
      WHERE league_id = $1
       AND status = 'waiting'
      LIMIT 1
    `;
        const result = await db.query<Lobby>(query, [
            leagueId
        ]);
        return result.rows[0];
    }
    async findInGameLobbyByLeague(leagueId: string) {
        const query = `
      SELECT *
      FROM lobbies
      WHERE league_id = $1
       AND status = 'in_game'
      LIMIT 1
    `;
        const result = await db.query(query, [
            leagueId
        ]);
        return result.rows[0];
    }
    async updateStatus(lobbyId: string, status: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        const query = `
      UPDATE lobbies
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
        const result = await executor.query<Lobby>(query, [
            status,
            lobbyId
        ]);
        return result.rows[0];
    }
    async resetReady(lobbyId: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        const query = `
      UPDATE lobby_players
      SET is_ready = FALSE
      WHERE lobby_id = $1
    `;
        await executor.query(query, [lobbyId]);
    }

    async resetTeamSelection(lobbyId: string, options: QueryOptions = {}): Promise<void> {
        const { executor = db } = options;
        await executor.query("DELETE FROM lobby_team_selection_votes WHERE lobby_id = $1", [lobbyId]);
        await executor.query("DELETE FROM lobby_team_confirmation_votes WHERE lobby_id = $1", [lobbyId]);
        await executor.query("DELETE FROM lobby_captain_votes WHERE lobby_id = $1", [lobbyId]);
        await executor.query("DELETE FROM lobby_draft_picks WHERE lobby_id = $1", [lobbyId]);
        await executor.query(`
            UPDATE lobbies
            SET team_selection_mode = NULL,
                team_selection_completed = FALSE,
                draft_captain_1 = NULL,
                draft_captain_2 = NULL,
                draft_pick_index = 0,
                team_selection_round = 0,
                captain_vote_ends_at = NULL
            WHERE id = $1
        `, [lobbyId]);
    }

    async getSelectionView(lobbyId: string, userId: string, lobby: Lobby) {
        const match = await db.query("SELECT id FROM matches WHERE lobby_id=$1 ORDER BY created_at DESC LIMIT 1", [lobbyId]);
        const selectionVotes = Number(lobby.maxPlayers) === 10
            ? await db.query("SELECT mode, COUNT(*)::int total FROM lobby_team_selection_votes WHERE lobby_id=$1 GROUP BY mode", [lobbyId]) : { rows: [] };
        const draftPicks = lobby.teamSelectionMode === "player_picks"
            ? await db.query("SELECT dp.user_id,dp.team_number,dp.pick_number,u.nickname,u.avatar_url FROM lobby_draft_picks dp JOIN users u ON u.id=dp.user_id WHERE dp.lobby_id=$1 ORDER BY dp.pick_number", [lobbyId]) : { rows: [] };
        const mySelectionVote = await db.query("SELECT mode FROM lobby_team_selection_votes WHERE lobby_id=$1 AND user_id=$2", [lobbyId, userId]);
        const confirmationVotes = lobby.teamSelectionMode === "random" && !lobby.teamSelectionCompleted
            ? await db.query("SELECT decision, COUNT(*)::int total FROM lobby_team_confirmation_votes WHERE lobby_id=$1 GROUP BY decision", [lobbyId]) : { rows: [] };
        const myConfirmationVote = await db.query("SELECT decision FROM lobby_team_confirmation_votes WHERE lobby_id=$1 AND user_id=$2", [lobbyId, userId]);
        const captainVotes = lobby.teamSelectionMode === "player_picks" && !lobby.draftCaptain1
            ? await db.query(`SELECT lp.user_id,u.nickname,u.avatar_url,COUNT(cv.voter_id)::int votes
                FROM lobby_players lp JOIN users u ON u.id=lp.user_id
                LEFT JOIN lobby_captain_votes cv ON cv.lobby_id=lp.lobby_id AND cv.candidate_id=lp.user_id
                WHERE lp.lobby_id=$1 GROUP BY lp.user_id,u.nickname,u.avatar_url ORDER BY votes DESC,u.nickname`, [lobbyId]) : { rows: [] };
        const myCaptainVote = await db.query("SELECT candidate_id FROM lobby_captain_votes WHERE lobby_id=$1 AND voter_id=$2", [lobbyId, userId]);
        return { matchId: match.rows[0]?.id ?? null, selectionVotes: selectionVotes.rows, draftPicks: draftPicks.rows,
            mySelectionVote: mySelectionVote.rows[0]?.mode ?? null, confirmationVotes: confirmationVotes.rows,
            myConfirmationVote: myConfirmationVote.rows[0]?.decision ?? null, captainVotes: captainVotes.rows,
            myCaptainVote: myCaptainVote.rows[0]?.candidateId ?? null };
    }

    async getPlayersForUpdate(lobbyId: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        const result = await executor.query(`SELECT lp.*,u.nickname FROM lobby_players lp
            JOIN users u ON u.id=lp.user_id WHERE lp.lobby_id=$1 ORDER BY lp.user_id FOR UPDATE OF lp`, [lobbyId]);
        return result.rows;
    }

    async createMatch(lobbyId: string, leagueId: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        const result = await executor.query("INSERT INTO matches (lobby_id,league_id,status,started_at) VALUES ($1,$2,'in_game',current_timestamp) RETURNING *", [lobbyId, leagueId]);
        return result.rows[0];
    }

    async addMatchPlayer(matchId: string, player: LobbyPlayerProfile, options: QueryOptions = {}) {
        const { executor = db } = options;
        await executor.query("INSERT INTO match_players (match_id,user_id,team_number,nickname_snapshot) VALUES ($1,$2,$3,$4)", [matchId, player.userId, player.teamNumber, player.nickname]);
    }

    async lockPlayer(userId: string, options: QueryOptions = {}) {
        const { executor = db } = options;
        await executor.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [userId]);
    }
    async findByLeague(lobbyId: string) {
        const query = `
        SELECT
          l.id,
          l.status,
          l.max_players,
          COUNT(lp.id) AS players_count
        FROM lobbies l

        LEFT JOIN lobby_players lp ON lp.lobby_id = l.id

        WHERE l.league_id = $1
          AND l.status <> 'cancelled'
        GROUP BY l.id

        ORDER BY
          l.created_at DESC
    `;
        const result = await db.query(query, [lobbyId]);
        return result.rows;
    }
}
