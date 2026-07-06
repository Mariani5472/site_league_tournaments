import { db } from "../../database/connection";
import { CreateLobbyDTO, Lobby } from "./lobbies.types";

export class LobbiesRepository {
  async findById(lobby_id: string) {
    const query = `
      SELECT *
      FROM lobbies
      WHERE id = $1
    `;

    const result = await db.query<Lobby>(
      query,
      [lobby_id]
    );

    return result.rows[0];
  }

  async create(
    league_id: string,
    user_id: string,
    data: CreateLobbyDTO
  ) {
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
      league_id,
      user_id,
      data.max_players
    ]);

    return result.rows[0]
  }

  async addPlayer(
    lobby_id: string,
    user_id: string,
    team_number: number,
  ) {
    const query = `
      INSERT INTO lobby_players (
        lobby_id,
        user_Id
        team_number
      )
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await db.query(query, [
      lobby_id,
      user_id,
      team_number,
    ]);

    return result.rows[0]
  }

  async updatePlayerTeam(
    lobby_id: string,
    user_id: string,
    team_number: number,
  ) {
    const query = `
      UPDATE lobby_players
      SET team_number = $1
      WHERE lobby_id = $2
      AND user_id = $3
      RETURNING * 
    `;

    const result = await db.query(query, [
      team_number,
      lobby_id,
      user_id,
    ]);

    return result.rows[0]
  }

  async updatePlayerReady(
    lobby_id: string,
    user_id: string,
    is_ready: boolean,
  ) {
    const query = `
      UPDATE lobby_players
      SET is_ready = $1
      WHERE lobby_id = $2
      AND user_id = $3
      RETURNING * 
    `;

    const result = await db.query(query, [
      is_ready,
      lobby_id,
      user_id,
    ]);

    return result.rows[0]
  }

  async removePlayer(
    lobby_id: string,
    user_id: string,
  ) {
    const query = `
      DELETE FROM lobby_players
      WHERE lobby_id = $1
      AND user_id = $2
      RETURNING *
    `;

    const result = await db.query(query, [
      lobby_id,
      user_id,
    ]);

    return result.rows[0]
  }

  async countPlayersByTeam(lobby_id: string) {
    const query = `
      SELECT
        team_number,
        COUNT(*) as total
      FROM lobby_players
      WHERE lobby_id = $1
      GROUP BY team_number
    `;

    const result = await db.query(query, [lobby_id]);

    return result.rows[0]
  }

  async findPlayerInLobby(
    lobby_id: string,
    user_id: string
  ) {
    const query = `
      SELECT *
      FROM lobby_players
      WHERE lobby_id = $1
      AND user_id = $2
    `;

    const result = await db.query(query, [lobby_id, user_id]);

    return result.rows[0]
  }

  async getLobbyPlayers(lobby_id: string) {
    const query = `
      SELECT *
      FROM lobby_players
      WHERE lobby_id = $1
    `;

    const result = await db.query(query, [lobby_id]);

    return result.rows;
  }

  async findLobbyWithPlayers(lobby_id: string) {
    const query = `
      SELECT
        l.id,
        l.league_id,
        l.status,
        l.max_players,

        lp.user_id,
        lp.team_number,
        lp.is_ready,

        u.nickname,
        u.avatar_url

      FROM lobbies l
      LEFT JOIN lobby_players lp ON lp.lobby_id = l.id
      LEFT JOIN users u ON u.id = lp.user_id

      WHERE l.id = $1
    `;

    const result = await db.query(query, [lobby_id]);

    return result.rows;
  }

  async updateStatus(lobby_id: string, status: string) {
    const query = `
      UPDATE lobbies
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await db.query(query, [
      status,
      lobby_id
    ]);

    return result.rows[0];
  }

  async findByLeague(lobby_id: string) {
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

    const result = await db.query(query, [lobby_id]);

    return result.rows;
  }
}