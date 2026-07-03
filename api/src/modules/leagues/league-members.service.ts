import { AppError } from "../../utils/AppError";
import { UsersRepository } from "../users/users.repository";
import { User } from "../users/users.types";
import { LeagueMembersRepository } from "./league-members.repostitory";
import { LeaguesRepository } from "./leagues.repository";
import {
  CreateLeagueMemberDTO,
  League,
  LeagueMember,
  ListLeagueMembersParams
} from "./leagues.types";

export class LeagueMembersService {
  private readonly leagueMembersRepository = new LeagueMembersRepository();
  private readonly leaguesRepository = new LeaguesRepository();
  private readonly usersRepository = new UsersRepository();

  private async ensureLeagueExists(league_id: string): Promise<League> {
    const league = await this.leaguesRepository.findById(league_id);

    if (!league) {
      throw new AppError("League not found", 404);
    }

    return league;
  }

  private async ensureUserExists(user_id: string): Promise<User> {
    const user = await this.usersRepository.findById(user_id);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }

  private ensureCanChangeRole(
    requester: LeagueMember,
    target: LeagueMember,
    newRole: CreateLeagueMemberDTO["role"]
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
    league_id: string | undefined,
    params: ListLeagueMembersParams
  ) {
    if (!league_id) {
      throw new AppError("League id is required", 400);
    }

    await this.ensureLeagueExists(league_id);

    return this.leagueMembersRepository.list(league_id, params);
  }

  async create(
    requester_id: string,
    league_id: string | undefined,
    user_id: string | undefined,
    params: CreateLeagueMemberDTO
  ) {
    if (!league_id) {
      throw new AppError("League id is required", 400);
    }

    if (!user_id) {
      throw new AppError("User id is required", 400);
    }

    await this.ensureLeagueExists(league_id);
    await this.ensureUserExists(user_id);

    const member = await this.leagueMembersRepository.findByLeagueAndUser(league_id, user_id);

    if (member) {
      throw new AppError("User is already a league member", 409);
    }

    return this.leagueMembersRepository.create(
      league_id,
      user_id,
      params
    );
  }

  async update(
    requester_id: string,
    league_id: string | undefined,
    user_id: string | undefined,
    params: CreateLeagueMemberDTO
  ) {
    if (!league_id) {
      throw new AppError("League id is required", 400);
    }

    if (!user_id) {
      throw new AppError("User id is required", 400);
    }

    await this.ensureLeagueExists(league_id);

    const requester = await this.leagueMembersRepository.findByLeagueAndUser(league_id, user_id);
    if (!requester) {
      throw new AppError("League requester not found", 404);
    }

    await this.ensureUserExists(user_id);

    const member = await this.leagueMembersRepository.findByLeagueAndUser(league_id, user_id);

    if (!member) {
      throw new AppError("League member not found", 404);
    }

    this.ensureCanChangeRole(requester, member, params.role)

    return this.leagueMembersRepository.update(league_id, user_id, params);
  }

  async remove(
    requester_id: string,
    league_id: string | undefined,
    user_id: string | undefined
  ) {
    if (!league_id) {
      throw new AppError("League id is required", 400);
    }

    if (!user_id) {
      throw new AppError("User id is required", 400);
    }

    await this.ensureLeagueExists(league_id);

    const requester = await this.leagueMembersRepository.findByLeagueAndUser(league_id, user_id);
    if (!requester) {
      throw new AppError("League requester not found", 404);
    }

    await this.ensureUserExists(user_id);

    const member = await this.leagueMembersRepository.findByLeagueAndUser(
      league_id,
      user_id
    );

    if (!member) {
      throw new AppError("League member not found", 404);
    }

    if (member.role === "owner") {
      throw new AppError("The league owner cannot be removed", 409);
    }

    await this.leagueMembersRepository.remove(league_id, user_id);
  }
}