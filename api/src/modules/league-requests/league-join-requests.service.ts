import { AppError } from "../../utils/AppError";
import { RiotRepository } from "../riot/riot.repository";
import { LeagueJoinRequestsRepository } from "./league-join-requests.repository";
import { LeagueMembersRepository } from "../league-members/league-members.repostitory";
import { ListLeagueJoinRequestsParams } from "../leagues/leagues.types";
import { LeaguesRepository } from "../leagues/leagues.repository";
import { SocketEmitter } from "../../weboscket/emitter";
import { SOCKET_EVENTS } from "../../weboscket/socket-events";

export class LeagueJoinRequestsService {
  private readonly leagueJoinRequestsRepository
    = new LeagueJoinRequestsRepository();
  private readonly leagueMembersRepository
    = new LeagueMembersRepository();
  private readonly leaguesRepository = new LeaguesRepository()
  private riotRepository = new RiotRepository();

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

    if (league.require_riot_account) {
      const riotAccount = await this.riotRepository.findByUserId(user_id);

      if (!riotAccount) {
        throw new AppError("This league requires a linked Riot ccount", 409);
      }
    }

    if (league.join_policy !== "request") {
      throw new AppError(`This action is only allowed for request leagues`, 409);
    }

    const request = await this.leagueJoinRequestsRepository.create({
      league_id: league_id,
      user_id: user_id
    });

    SocketEmitter.emitToLeague(league.id, SOCKET_EVENTS.LEAGUE_REQUESTS_UPDATE, {
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

    const league = await this.leaguesRepository.findById(league_id);
    if (!league) {
      throw new AppError("League not found", 404);
    }

    const request = await this.leagueJoinRequestsRepository.findById(request_id);
    if (!request) {
      throw new AppError("Request not found", 404);
    }

    const requester = await this.leagueMembersRepository.findByLeagueAndUser(
      league_id,
      requester_id
    );
    const allowedRoles = ["owner", "admin"];
    if (!requester || !allowedRoles.includes(requester.role)) {
      throw new AppError("Unauthorized", 401);
    }

    const { status } = params;
    if (status == "approved") {
      const totalPlayers = await this.leagueMembersRepository.count(league_id);
      if (totalPlayers >= league.max_players) {
        throw new AppError("League is full", 409);
      }

      await this.leagueMembersRepository.create(league_id, request.user_id, {
        role: "player"
      })
    }
    const updatedRequest = await this.leagueJoinRequestsRepository.update(request_id, { status })

    SocketEmitter.emitToLeague(league.id, SOCKET_EVENTS.LEAGUE_REQUESTS_UPDATE, {
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