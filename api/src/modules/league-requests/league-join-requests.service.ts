import { AppError } from "../../utils/AppError";
import { LeagueJoinRequestsRepository } from "./league-join-requests.repository";
import { LeagueMembersRepository } from "../league-members/league-members.repostitory";
import { ListLeagueJoinRequestsParams } from "../leagues/leagues.types";
import { LeaguesRepository } from "../leagues/leagues.repository";
import { SocketEmitter } from "../../weboscket/emitter";
import { SOCKET_EVENTS } from "../../weboscket/socket-events";
import { db } from "../../database/connection";

export class LeagueJoinRequestsService {
  private readonly leagueJoinRequestsRepository
    = new LeagueJoinRequestsRepository();
  private readonly leagueMembersRepository
    = new LeagueMembersRepository();
  private readonly leaguesRepository = new LeaguesRepository()

  async list(
    requester_id: string,
    league_id: string,
    params: ListLeagueJoinRequestsParams
  ) {
    if (!league_id) {
      throw new AppError("League not found", 404);
    }

    const league = await this.leaguesRepository.findById(league_id);
    if (!league) {
      throw new AppError("League not found", 404);
    }

    const requester = await this.leagueMembersRepository.findByLeagueAndUser(
      league_id,
      requester_id
    );

    const allowedRoles = ["owner", "admin"];

    if (!requester || !allowedRoles.includes(requester.role)) {
      throw new AppError("Unauthorized", 401);
    }

    return await this.leagueJoinRequestsRepository.list(league_id, params);
  }

  async create(user_id: string, league_id: string) {
    if (!league_id) {
      throw new AppError("League not found", 404);
    }
    const league = await this.leaguesRepository.findById(league_id);
    if (!league) {
      throw new AppError("League not found", 404);
    }

    const totalPlayers = await this.leagueMembersRepository.count(league_id);
    if (totalPlayers >= league.max_players) {
      throw new AppError("League is full", 409);
    }

    const member = await this.leagueMembersRepository.findByLeagueAndUser(
      league_id,
      user_id
    );

    if (member) {
      throw new AppError("User is already a member", 409);
    }

    const existingRequests = await this.leagueJoinRequestsRepository.findByLeagueAndUser(
      league_id,
      user_id
    );

    if (existingRequests.some(req => req.status == 'pending')) {
      throw new AppError("Join request already exists", 409);
    }

    if (league.join_policy !== "request") {
      throw new AppError(`This action is only allowed for request leagues`, 409);
    }

    const request = await this.leagueJoinRequestsRepository.create({
      league_id: league_id,
      user_id: user_id
    });

    SocketEmitter.emitToLeague(league_id, SOCKET_EVENTS.LEAGUE_REQUESTS_UPDATE, {
      league_id
    });

    return request;
  }

  async update(
    league_id: string,
    request_id: string,
    requester_id: string,
    params: { status: | "approved" | "rejected" }
  ) {
    if (!league_id) {
      throw new AppError("League not found", 404);
    }

    if (!['approved', 'rejected'].includes(params.status)) throw new AppError("Invalid request status", 400);
    const client = await db.connect();
    let updatedRequest;
    try {
      await client.query("BEGIN");
      const leagueResult = await client.query("SELECT * FROM leagues WHERE id = $1 FOR UPDATE", [league_id]);
      const league = leagueResult.rows[0];
      if (!league) throw new AppError("League not found", 404);
      const requester = await client.query("SELECT role FROM league_members WHERE league_id = $1 AND user_id = $2", [league_id, requester_id]);
      if (!requester.rowCount || !['owner', 'admin'].includes(requester.rows[0].role)) throw new AppError("Unauthorized", 403);
      const requestResult = await client.query("SELECT * FROM league_join_requests WHERE id = $1 AND league_id = $2 FOR UPDATE", [request_id, league_id]);
      const request = requestResult.rows[0];
      if (!request) throw new AppError("Request not found", 404);
      if (request.status !== 'pending') throw new AppError("Request already processed", 409);
      if (params.status === 'approved') {
        const count = await client.query("SELECT COUNT(*)::int total FROM league_members WHERE league_id = $1", [league_id]);
        if (Number(count.rows[0].total) >= league.max_players) throw new AppError("League is full", 409);
        await client.query("INSERT INTO league_members (league_id, user_id, role) VALUES ($1, $2, 'player') ON CONFLICT (league_id, user_id) DO NOTHING", [league_id, request.user_id]);
      }
      const updated = await client.query("UPDATE league_join_requests SET status = $2 WHERE id = $1 RETURNING *", [request_id, params.status]);
      updatedRequest = updated.rows[0];
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }

    SocketEmitter.emitToLeague(league_id, SOCKET_EVENTS.LEAGUE_REQUESTS_UPDATE, {
      league_id
    });

    return updatedRequest;
  }

  async remove(
    league_id: string,
    request_id: string,
    requester_id: string
  ) {
    if (!league_id) {
      throw new AppError("League not found", 404);
    }

    const league = await this.leaguesRepository.findById(league_id);
    if (!league) {
      throw new AppError("League not found", 404);
    }

    const request = await this.leagueJoinRequestsRepository.findById(request_id);
    if (!request) {
      throw new AppError("Request not found", 404);
    }

    if (request.status !== 'pending') {
      throw new AppError("Request unavailable", 409);
    }

    const requester = await this.leagueMembersRepository.findByLeagueAndUser(
      league_id,
      requester_id
    );
    const allowedRoles = ["owner", "admin"];
    if (!requester || !allowedRoles.includes(requester.role)) {
      throw new AppError("Unauthorized", 401);
    }

    this.leagueJoinRequestsRepository.delete(request_id);

    SocketEmitter.emitToLeague(league.id, SOCKET_EVENTS.LEAGUE_REQUESTS_UPDATE, {
      league_id
    });
  }
}
