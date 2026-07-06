import { db } from "../../database/connection";

export class MatchesRepository {
  async create(
    lobby_id: string,
    league_id: string,
  ) {
    const query = `
      INSERT INTO matches (
        lobby_id,
        league_id
      )
      VALUES ($1, $2)
      RETURNING *
    `;

    const result = await db.query(query, [
      lobby_id,
      league_id
    ]);

    return result.rows[0];
  }

  async addPlayer(
    match_id: string,
    user_id: string,
    team_number: number,
  ) {
    const query = `
      INSERT INTO match_players (
        match_id,
        user_id,
        team_number
      )
      VALUES ($1,$2,$3)
    `;

    await db.query(query, [
      match_id,
      user_id,
      team_number
    ]);
  }
}