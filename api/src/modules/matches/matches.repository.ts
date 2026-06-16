import { db } from "../../database/connection";

export class MatchesRepository {
  async create(params: {
    lobbyId: string;
    leagueId: string;
  }) {
    const query = `
      INSERT INTO matches (
        lobby_id,
        league_id
      )
      VALUES ($1, $2)
      RETURNING *
    `;

    const result = await db.query(query, [
      params.lobbyId,
      params.leagueId
    ]);

    return result.rows[0];
  }

  async addPlayer(params: {
    matchId: string;
    userId: string;
    teamNumber: number;
  }) {
    const query = `
      INSERT INTO match_players (
        match_id,
        user_id,
        team_number
      )
      VALUES ($1,$2,$3)
    `;

    await db.query(query, [
      params.matchId,
      params.userId,
      params.teamNumber
    ]);
  }
}