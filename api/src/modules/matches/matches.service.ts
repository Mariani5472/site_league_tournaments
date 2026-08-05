import { db } from "../../database/connection";
import { AppError } from "../../utils/AppError";
import { SocketEmitter } from "../../weboscket/emitter";
import { SOCKET_EVENTS } from "../../weboscket/socket-events";
import { LeagueMembersRepository } from "../league-members/league-members.repostitory";
import { MatchesRepository } from "./matches.repository";

export class MatchesService {
  private repository = new MatchesRepository();
  private members = new LeagueMembersRepository();

  private async requireLeagueAccess(leagueId: string, userId: string) {
    const member = await this.members.findByLeagueAndUser(leagueId, userId);
    if (!member) throw new AppError("Not a league member", 403);
    return member;
  }

  async list(leagueId: string, userId: string) {
    await this.requireLeagueAccess(leagueId, userId);
    return this.repository.listByLeague(leagueId);
  }

  async standings(leagueId: string, userId: string) {
    await this.requireLeagueAccess(leagueId, userId);
    return this.repository.standings(leagueId);
  }

  async show(matchId: string, userId: string) {
    const match = await this.repository.details(matchId, userId);
    if (!match) throw new AppError("Match not found", 404);
    await this.requireLeagueAccess(match.league_id, userId);
    const eligible = match.players.length;
    return { ...match, majority_required: Math.floor(eligible / 2) + 1 };
  }

  async vote(matchId: string, userId: string, winnerTeam: number) {
    if (![1, 2].includes(winnerTeam)) {
      throw new AppError("Invalid team", 400)
    };

    const client = await db.connect();
    let finished: any = null;
    let leagueId = "";

    try {
      await client.query("BEGIN");
      const locked = await client.query(`SELECT m.* FROM matches m
        JOIN lobbies l ON l.id = m.lobby_id AND l.league_id = m.league_id
        WHERE m.id = $1 FOR UPDATE OF m`, [matchId]);
      const match = locked.rows[0];

      if (!match) {
        throw new AppError("Match not found", 404)
      };

      leagueId = match.league_id;
      if (match.status !== "in_game") {
        throw new AppError("Voting is closed", 409)
      };

      const eligible = await client.query("SELECT 1 FROM match_players WHERE match_id = $1 AND user_id = $2", [matchId, userId]);
      if (!eligible.rowCount) {
        throw new AppError("Only match participants can vote", 403)
      };

      await client.query(`
        INSERT INTO match_votes (match_id, voter_id, winner_team)
        VALUES ($1, $2, $3) ON CONFLICT (match_id, voter_id)
        DO UPDATE SET winner_team = EXCLUDED.winner_team, updated_at = current_timestamp`,
        [matchId, userId, winnerTeam]
      );

      const counts = await client.query(`
        SELECT winner_team, COUNT(*)::int total FROM match_votes WHERE match_id = $1 GROUP BY winner_team`,
        [matchId]
      );

      const totalEligible = Number((await client.query("SELECT COUNT(*)::int total FROM match_players WHERE match_id = $1", [matchId])).rows[0].total);
      const majority = Math.floor(totalEligible / 2) + 1;
      const winner = counts.rows.find(row => Number(row.total) >= majority);
      if (winner) finished = await this.repository.finalize(client, matchId, Number(winner.winner_team), "vote");
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    SocketEmitter.emitToLeague(leagueId, SOCKET_EVENTS.MATCH_VOTE, { league_id: leagueId, match_id: matchId });
    if (finished) SocketEmitter.emitToLeague(leagueId, SOCKET_EVENTS.MATCH_FINISHED, { league_id: leagueId, match_id: matchId });
    return this.show(matchId, userId);
  }

  async resolve(matchId: string, userId: string, winnerTeam: number, reason: string) {
    if (![1, 2].includes(winnerTeam)) throw new AppError("Invalid team", 400);
    if (!reason?.trim() || reason.trim().length < 5) throw new AppError("A justification is required", 400);
    const client = await db.connect();
    let leagueId = "";
    try {
      await client.query("BEGIN");
      const locked = await client.query(`SELECT m.* FROM matches m
        JOIN lobbies l ON l.id = m.lobby_id AND l.league_id = m.league_id
        WHERE m.id = $1 FOR UPDATE OF m`, [matchId]);
      const match = locked.rows[0];
      if (!match) throw new AppError("Match not found", 404);
      leagueId = match.league_id;
      const member = await client.query("SELECT role FROM league_members WHERE league_id = $1 AND user_id = $2", [leagueId, userId]);
      if (!member.rowCount || !["owner", "admin"].includes(member.rows[0].role)) throw new AppError("Insufficient permissions", 403);
      const finished = await this.repository.finalize(client, matchId, winnerTeam, "admin", userId, reason.trim());
      if (!finished) throw new AppError("Match is already finalized", 409);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    SocketEmitter.emitToLeague(leagueId, SOCKET_EVENTS.MATCH_FINISHED, { league_id: leagueId, match_id: matchId });
    return this.show(matchId, userId);
  }
}
