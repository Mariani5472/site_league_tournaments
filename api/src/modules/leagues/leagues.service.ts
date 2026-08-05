import { AppError } from "../../utils/AppError";
import { SocketEmitter } from "../../weboscket/emitter";
import { SOCKET_EVENTS } from "../../weboscket/socket-events";
import { LeagueMembersRepository } from "../league-members/league-members.repostitory";
import { UsersRepository } from "../users/users.repository";
import { LeaguesRepository } from "./leagues.repository";
import { CreateLeagueDTO, ListLeaguesParams } from "./leagues.types";
import { db } from "../../database/connection";

export class LeaguesService {
  private usersRepository = new UsersRepository();
  private leaguesRepository = new LeaguesRepository();
  private leagueMembersRepository = new LeagueMembersRepository();

  async list(user_id: string, params: ListLeaguesParams) {
    if (!user_id) {
      throw new AppError("User not found", 401)
    }

    return await this.leaguesRepository.list({
      ...params,
      user_id: params.user_id ?? user_id
    });
  }

  async mine(user_id: string) {
    if (!user_id) {
      throw new AppError("User not found", 401)
    }

    const user = await this.usersRepository.findById(user_id);

    if (!user) {
      throw new AppError("User not found", 401)
    }

    return this.leaguesRepository.listMine(user.id);
  }

  async discover(user_id: string, search?: string) {
    if (!user_id) {
      throw new AppError("User not found", 401)
    }

    const user = await this.usersRepository.findById(user_id);

    if (!user) {
      throw new AppError("User not found", 401)
    }

    return this.leaguesRepository.discover(user.id, search);
  }

  async show(league_id: string | undefined, user_id: string) {
    if (!league_id) {
      throw new AppError("League not found", 404);
    }

    const league = await this.leaguesRepository.findById(league_id);
    if (!league) throw new AppError("League not found", 404);
    if (league.visibility === "private") {
      const member = await this.leagueMembersRepository.findByLeagueAndUser(league_id, user_id);
      if (!member) throw new AppError("League not found", 404);
    }
    return league;
  }


  async create(user_id: string, params: CreateLeagueDTO) {
    if (!user_id) {
      throw new AppError("User not found", 401)
    }

    const league = await this.leaguesRepository.create(params);

    await this.leagueMembersRepository.create(
      league.id,
      user_id,
      { role: "owner" }
    );

    return league;
  }

  async join(league_id: string | undefined, user_id: string) {
    if (!league_id) throw new AppError("League not found", 404);
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query("SELECT * FROM leagues WHERE id = $1 FOR UPDATE", [league_id]);
      const league = result.rows[0];
      if (!league) throw new AppError("League not found", 404);
      if (league.visibility !== "public" || league.join_policy !== "open") throw new AppError("This league does not allow direct entry", 409);
      const existing = await client.query("SELECT * FROM league_members WHERE league_id = $1 AND user_id = $2", [league_id, user_id]);
      if (existing.rowCount) { await client.query("COMMIT"); return existing.rows[0]; }
      const count = await client.query("SELECT COUNT(*)::int total FROM league_members WHERE league_id = $1", [league_id]);
      if (Number(count.rows[0].total) >= league.max_players) throw new AppError("League is full", 409);
      const member = await client.query("INSERT INTO league_members (league_id, user_id, role) VALUES ($1, $2, 'player') RETURNING *", [league_id, user_id]);
      await client.query("COMMIT");
      SocketEmitter.emitToLeague(league_id, SOCKET_EVENTS.LEAGUE_MEMBERS_UPDATE, { league_id });
      return member.rows[0];
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }

  async update(
    league_id: string | undefined,
    user_id: string,
    params: {
      name?: string;
      description?: string;
      visibility?: string;
      join_policy?: string;
      max_players?: number;
    }
  ) {

    if (!league_id) {
      throw new AppError("League not found", 404);
    }
    const league = await this.leaguesRepository.findById(league_id);

    if (!league) {
      throw new AppError("League not found", 404);
    }

    if (!user_id) {
      throw new AppError("User not found", 404);
    }

    const member = await this.leagueMembersRepository.findByLeagueAndUser(
      league_id,
      user_id
    );

    if (!member) {
      throw new AppError("Not a league member");
    }

    const allowedRoles = ["owner", "admin"];

    if (!allowedRoles.includes(member.role)) {
      throw new AppError("Insufficient permissions");
    }

    const updatedLeague = await this.leaguesRepository.update(league_id, params);

    SocketEmitter.emitToLeague(league.id, SOCKET_EVENTS.LEAGUE_UPDATE, {
      league_id
    })

    return updatedLeague;
  }

  async remove(league_id: string | undefined, user_id: string) {
    if (!league_id) {
      throw new AppError("League not found", 404);
    }
    const league = await this.leaguesRepository.findById(league_id);

    if (!league) {
      throw new AppError("League not found", 404);
    }

    const member = await this.leagueMembersRepository.findByLeagueAndUser(
      league_id, user_id
    );

    if (!member) {
      throw new AppError("Not a league member");
    }

    if (member.role !== "owner") {
      throw new AppError("Only owner can delete league");
    }

    await this.leaguesRepository.remove(league_id);

    SocketEmitter.emitToLeague(league.id, SOCKET_EVENTS.LEAGUE_DELETE, {
      league_id
    })
  }
}
