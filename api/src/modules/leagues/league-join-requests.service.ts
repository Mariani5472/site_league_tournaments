import { AppError } from "../../utils/AppError";
import { LeagueJoinRequestsRepository } from "./league-join-requests.repository";
import { LeagueMembersRepository } from "./league-members.repostitory";
import { ListLeagueJoinRequestsParams } from "./leagues.types";

export class LeagueJoinRequestsService {
  private readonly leagueJoinRequestsRepository
    = new LeagueJoinRequestsRepository();
  private readonly leagueMembersRepository
    = new LeagueMembersRepository();

  async list(user_id: string, params: ListLeagueJoinRequestsParams) {
    if (!params.league_id) {
      throw new AppError("League not found", 404);
    }

    const actorMember = await this.leagueMembersRepository.find({
      league_Id: params.league_id,
      user_Id: user_id
    });

    const allowedRoles = ["owner", "admin"];

    if (!allowedRoles.includes(actorMember.role)) {
      throw new AppError("Unauthorized", 401);
    }

    return await this.leagueJoinRequestsRepository.list(params);
  }
}