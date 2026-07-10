import { AppError } from "../../utils/AppError";
import { LeagueMembersRepository } from "../league-members/league-members.repostitory";
import { UsersRepository } from "../users/users.repository";
import { LeaguesRepository } from "./leagues.repository";
import { CreateLeagueDTO, ListLeaguesParams } from "./leagues.types";

export class LeaguesService {
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

  async show(league_id?: string) {
    if (!league_id) {
      throw new AppError("League not found", 404);
    }

    return await this.leaguesRepository.findById(league_id);
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

    return await this.leaguesRepository.update(league_id, params);
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
  }
}