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
    async addPlayer(lobbyId: string, userId: string, teamNumber: number) {
        const query = `
      INSERT INTO lobby_players (
        lobby_id,
        user_Id,
        team_number
      )
      VALUES ($1, $2, $3)
      RETURNING *
    `;
        const result = await db.query(query, [
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
    async countPlayersByTeam(lobbyId: string) {
        const query = `
      SELECT
        team_number,
        COUNT(*) as total
      FROM lobby_players
      WHERE lobby_id = $1
      GROUP BY team_number
    `;
        const result = await db.query(query, [lobbyId]);
        return result.rows;
    }
    async findActiveLobbyByPlayer(userId: string) {
        const query = `
      SELECT l.* 
      FROM lobbies l
      INNER JOIN lobby_players lp ON lp.lobby_id = l.id
      WHERE lp.user_id = $1
        AND l.status IN ('in_game', 'waiting')
      LIMIT 1;
    `;
        const result = await db.query<Lobby>(query, [userId]);
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
        GROUP BY l.id

        ORDER BY
          l.created_at DESC
    `;
        const result = await db.query(query, [lobbyId]);
        return result.rows;
    }
    async remove(lobbyId: string) {
        const query = `
      DELETE FROM lobbies
      WHERE id = $1
    `;
        const result = await db.query(query, [lobbyId]);
        return result.rows;
    }
}
