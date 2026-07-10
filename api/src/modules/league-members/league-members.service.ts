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

    const member = await this.leagueMembersRepository.findByLeagueAndUser(league_id, user_id);
    if (member) {
      return member;
    }

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

    const league = await this.leaguesRepository.findById(league_id);
    if (!league) {
      throw new AppError("League not found", 404);
    }

    const requester = await this.leagueMembersRepository.findByLeagueAndUser(league_id, requester_id);
    if (!requester) {
      throw new AppError("League requester not found", 404);
    }

    const user = await this.usersRepository.findById(user_id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const member = await this.leagueMembersRepository.findByLeagueAndUser(league_id, user_id);

    if (!member) {
      throw new AppError("League member not found", 404);
    }

    this.ensureCanChangeRole(requester, member, params.role)

    return this.leagueMembersRepository.update(league_id, user_id, params);
  }

  async remove(
    requester_id: string | undefined,
    league_id: string | undefined,
    user_id: string | undefined
  ) {
    if (!league_id) {
      throw new AppError("League id is required", 400);
    }

    if (!user_id) {
      throw new AppError("User id is required", 400);
    }

    if (!requester_id) {
      throw new AppError("Requester id is required", 400);
    }

    const league = await this.leaguesRepository.findById(league_id);
    if (!league) {
      throw new AppError("League not found", 404);
    }

    const requester = await this.leagueMembersRepository.findByLeagueAndUser(league_id, requester_id);
    if (!requester) {
      throw new AppError("League requester not found", 404);
    }

    const member = await this.leagueMembersRepository.findById(user_id);

    if (!member) {
      throw new AppError("League member not found", 404);
    }

    const user = await this.usersRepository.findById(member.user_id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    this.ensureCanChangeRole(requester, member, 'spec');

    return await this.leagueMembersRepository.remove(league_id, user.id);
  }
}