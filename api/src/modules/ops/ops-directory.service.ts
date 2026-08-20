import { AppError } from "../../utils/AppError";
import { OpsDirectoryRepository } from "./ops-directory.repository";
import type { OpsLeagueListParams, OpsUserListParams } from "./ops-directory.types";

export class OpsDirectoryService {
    constructor(private readonly directory = new OpsDirectoryRepository()) {}

    listUsers(params: OpsUserListParams) {
        return this.directory.listUsers(params);
    }

    async userDetail(userId: string) {
        const detail = await this.directory.userDetail(userId);
        if (!detail) throw new AppError("User not found", 404);
        return detail;
    }

    listLeagues(params: OpsLeagueListParams) {
        return this.directory.listLeagues(params);
    }

    async leagueDetail(leagueId: string) {
        const detail = await this.directory.leagueDetail(leagueId);
        if (!detail) throw new AppError("League not found", 404);
        return detail;
    }
}
