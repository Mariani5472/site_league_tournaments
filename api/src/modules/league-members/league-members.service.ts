import { AppError } from "../../utils/AppError";
import { UsersRepository } from "../users/users.repository";
import { User } from "../users/users.types";
import { LeagueMembersRepository } from "./league-members.repostitory";
import {
  CreateLeagueMemberDTO,
  LeagueMember,
  ListLeagueMembersParams
} from "../leagues/leagues.types";
import { LeaguesRepository } from "../leagues/leagues.repository";
import { SocketEmitter } from "../../weboscket/emitter";
import { SOCKET_EVENTS } from "../../weboscket/socket-events";
import { db } from "../../database/connection";

export class LeagueMembersService {
  private readonly leagueMembersRepository = new LeagueMembersRepository();
  private readonly leaguesRepository = new LeaguesRepository()
  private readonly usersRepository = new UsersRepository();

  private ensureCanChangeRole(
    requester: LeagueMember,
    target: LeagueMember,
    newRole: CreateLeagueMemberDTO["role"] | "none"
  ) {
    const isSelf = requester.user_id === target.user_id;

    if (["player", "spec"].includes(requester.role)) {
      throw new AppError("Unauthorized", 403);
    }

    if (requester.role === "admin") {
      if (isSelf) {
        throw new AppError("Admins cannot change their own role", 403);
      }

      if (target.role === "owner") {
        throw new AppError("Admins cannot modify the owner", 403);
      }

      if (target.role === "admin") {
        throw new AppError("Admins cannot modify other admins", 403);
      }

      if (newRole === "admin" || newRole === "owner") {
        throw new AppError("Admins cannot assign admin or owner roles", 403);
      }

      return;
    }

    if (isSelf && newRole !== "owner") {
      throw new AppError("The league must always have an owner", 409);
    }

    if (target.role === "owner" && newRole !== "owner") {
      throw new AppError("Owners cannot change another owner's role", 409);
    }
  }

  async list(
    user_id: string | undefined,
    league_id: string | undefined,
    params: ListLeagueMembersParams
  ) {
    if (!league_id) {
      throw new AppError("League not found", 404);
    }

    if (!user_id) {
      throw new AppError("User not found", 404);
    }

    const league = await this.leaguesRepository.findById(league_id);
    if (!league) {
      throw new AppError("League not found", 404);
    }

    return this.leagueMembersRepository.list(league_id, params);
  }

  async create(
    requester_id: string | undefined,
    league_id: string | undefined,
    user_id: string | undefined,
    params: CreateLeagueMemberDTO
  ) {
    if (!league_id) {
      throw new AppError("League not found", 404);
    }

    if (!requester_id) {
      throw new AppError("Requester not found", 404);
    }

    if (!user_id) {
      throw new AppError("User not found", 404);
    }

    const league = await this.leaguesRepository.findById(league_id);
    if (!league) {
      throw new AppError("League not found", 404);
    }

    const user = await this.usersRepository.findById(user_id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const requester = await this.leagueMembersRepository.findByLeagueAndUser(league_id, requester_id);
    if (!requester) {
      throw new AppError("League requester not found", 404);
    }

    if (!['owner', 'admin'].includes(requester.role)) throw new AppError("Unauthorized", 403);
    if (requester.role === 'admin' && ['owner', 'admin'].includes(params.role)) throw new AppError("Admins cannot assign privileged roles", 403);

    const member = await this.leagueMembersRepository.findByLeagueAndUser(league_id, user_id);
    if (member) {
      return member;
    }

    SocketEmitter.emitToLeague(league.id, SOCKET_EVENTS.LEAGUE_MEMBERS_UPDATE, {
      league_id
    });

    return this.leagueMembersRepository.create(
      league_id,
      user_id,
      params
    );
  }

  async update(
    requester_id: string | undefined,
    league_id: string | undefined,
    user_id: string | undefined,
    params: CreateLeagueMemberDTO
  ) {
    if (!league_id) {
      throw new AppError("League id is required", 400);
    }

    if (!requester_id) {
      throw new AppError("Requester id is required", 400);
    }

    if (!user_id) {
      throw new AppError("User id is required", 400);
    }

    const client = await db.connect();
    let updatedRole;
    try {
      await client.query("BEGIN");
      const leagueResult = await client.query("SELECT * FROM leagues WHERE id = $1 FOR UPDATE", [league_id]);
      const league = leagueResult.rows[0];
      if (!league) throw new AppError("League not found", 404);
      const requesterResult = await client.query("SELECT * FROM league_members WHERE league_id = $1 AND user_id = $2 FOR UPDATE", [league_id, requester_id]);
      const targetResult = await client.query("SELECT * FROM league_members WHERE id = $1 AND league_id = $2 FOR UPDATE", [user_id, league_id]);
      const requester = requesterResult.rows[0] as LeagueMember | undefined;
      const member = targetResult.rows[0] as LeagueMember | undefined;
      if (!requester) throw new AppError("League requester not found", 404);
      if (!member) throw new AppError("League member not found", 404);

      if (params.role === "owner") {
        if (requester.role !== "owner") throw new AppError("Only the owner can transfer ownership", 403);
        if (member.role === "owner") { await client.query("COMMIT"); return member; }
        await client.query("UPDATE league_members SET role = 'admin' WHERE league_id = $1 AND user_id = $2", [league_id, requester.user_id]);
        const promoted = await client.query("UPDATE league_members SET role = 'owner' WHERE id = $1 RETURNING *", [member.id]);
        await client.query("UPDATE leagues SET owner_id = $2 WHERE id = $1", [league_id, member.user_id]);
        updatedRole = promoted.rows[0];
      } else {
        this.ensureCanChangeRole(requester, member, params.role);
        const changed = await client.query("UPDATE league_members SET role = $2 WHERE id = $1 RETURNING *", [member.id, params.role]);
        updatedRole = changed.rows[0];
      }
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }

    SocketEmitter.emitToLeague(league_id, SOCKET_EVENTS.LEAGUE_MEMBERS_UPDATE, {
      league_id
    });

    return updatedRole;
  }

  async remove(
    requester_id: string | undefined,
    league_id: string | undefined,
    member_id: string | undefined
  ) {
    if (!league_id) {
      throw new AppError("League id is required", 400);
    }

    if (!member_id) {
      throw new AppError("User id is required", 400);
    }

    if (!requester_id) {
      throw new AppError("Requester id is required", 400);
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const league = await client.query("SELECT 1 FROM leagues WHERE id = $1 FOR UPDATE", [league_id]);
      if (!league.rowCount) throw new AppError("League not found", 404);
      const requesterResult = await client.query("SELECT * FROM league_members WHERE league_id = $1 AND user_id = $2 FOR UPDATE", [league_id, requester_id]);
      const memberResult = await client.query("SELECT * FROM league_members WHERE id = $1 AND league_id = $2 FOR UPDATE", [member_id, league_id]);
      const requester = requesterResult.rows[0] as LeagueMember | undefined;
      const member = memberResult.rows[0] as LeagueMember | undefined;
      if (!requester) throw new AppError("League requester not found", 404);
      if (!member) throw new AppError("League member not found", 404);
      if (member.role === "owner") throw new AppError("Transfer ownership before removing the owner", 409);
      if (requester.id !== member.id) this.ensureCanChangeRole(requester, member, "spec");
      await client.query("DELETE FROM league_members WHERE id = $1", [member.id]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }

    SocketEmitter.emitToLeague(league_id, SOCKET_EVENTS.LEAGUE_MEMBERS_UPDATE, {
      league_id
    });
  }
}
