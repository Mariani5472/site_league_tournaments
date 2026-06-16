import { db } from "../../database/connection";
import { CreateLobbyDTO } from "./lobbies.types";

export class LobbiesRepository {
  async findById(lobbyId: string) {
    const query = `
      SELECT *
      FROM lobbies
      WHERE id = $1
    `;

    const result = await db.query(
      query,
      [lobbyId]
    );

    return result.rows[0];
  }

  async create(data: CreateLobbyDTO) {
    const query = `
      INSERT INTO lobbies (
        league_id,
        max_players,
        created_by
      )
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await db.query(query, [
      data.leagueId,
      data.maxPlayers,
      data.creatorId,
    ]);

    return result.rows[0]
  }

  async addPlayer(params: {
    lobbyId: string,
    userId: string,
    teamNumber: number,
  }) {
    const query = `
      INSERT INTO lobby_players (
        lobby_id,
        team_number,
        user_Id
      )
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await db.query(query, [
      params.lobbyId,
      params.teamNumber,
      params.userId,
    ]);

    return result.rows[0]
  }

  async updatePlayerTeam(params: {
    lobbyId: string,
    userId: string,
    newTeamNumber: number,
  }) {
    const query = `
      UPDATE lobby_players
      SET team_number = $1
      WHERE lobby_id = $2
      AND user_id = $3
      RETURNING * 
    `;

    const result = await db.query(query, [
      params.newTeamNumber,
      params.lobbyId,
      params.userId,
    ]);

    return result.rows[0]
  }

  async updatePlayerReady(params: {
    lobbyId: string,
    userId: string,
    isReady: boolean,
  }) {
    const query = `
      UPDATE lobby_players
      SET is_ready = $1
      WHERE lobby_id = $2
      AND user_id = $3
      RETURNING * 
    `;

    const result = await db.query(query, [
      params.isReady,
      params.lobbyId,
      params.userId,
    ]);

    return result.rows[0]
  }

  async removePlayer(params: {
    lobbyId: string,
    userId: string,
  }) {
    const query = `
      DELETE FROM lobby_players
      WHERE lobby_id = $1
      AND user_id = $2
      RETURNING *
    `;

    const result = await db.query(query, [
      params.lobbyId,
      params.userId,
    ]);

    return result.rows[0]
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

    return result.rows[0]
  }

  async findPlayerInLobby(
    lobbyId: string,
    userId: string
  ) {
    const query = `
      SELECT *
      FROM lobby_players
      WHERE lobby_id = $1
      AND user_id = $2
    `;

    const result = await db.query(query, [lobbyId, userId]);

    return result.rows[0]
  }

  async getLobbyPlayers(lobbyId: string) {
    const query = `
      SELECT *
      FROM lobby_players
      WHERE lobby_id = $1
    `;

    const result = await db.query(query, [lobbyId]);

    return result.rows;
  }

  async updateStatus(lobbyId: string, status: string) {
    const query = `
      UPDATE lobbies
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await db.query(query, [
      status,
      lobbyId
    ]);

    return result.rows[0];
  }
}