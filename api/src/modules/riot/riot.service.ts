import { RiotClient } from "./riot.client";
import { RiotRepository } from "./riot.repository";
import { getRiotConfiguration, getRiotCredentials } from "./riot.config";
import { AppError } from "../../utils/AppError";
export class RiotService {
    private riotRepository = new RiotRepository();
    configuration() {
        return getRiotConfiguration();
    }
    async getMyAccount(userId: string) {
        const account = await this.riotRepository.findByUserId(userId);
        return account ?? null;
    }
    async linkAccount(params: {
        userId: string;
        gameName: string;
        tagLine: string;
    }) {
        const credentials = getRiotCredentials();
        if (!credentials)
            throw new AppError("Riot account linking is not configured", 503);
        const riotClient = new RiotClient(credentials.token, credentials.region);
        const account = await riotClient.getAccountByRiotId(params.gameName, params.tagLine);
        const existingPuuid = await this.riotRepository.findByPuuid(account.puuid);
        if (existingPuuid) {
            throw new AppError("Riot account already linked", 409);
        }
        const existingUser = await this.riotRepository.findByUserId(params.userId);
        if (existingUser) {
            throw new AppError("User already linked a Riot account", 409);
        }
        const riotAccount = await this.riotRepository.create({
            userId: params.userId,
            gameName: account.gameName,
            tagLine: account.tagLine,
            puuid: account.puuid,
            region: credentials.region
        });
        return riotAccount;
    }
    async unlinkAccount(userId: string) {
        const account = await this.riotRepository.findByUserId(userId);
        if (!account) {
            throw new AppError("No Riot account linked", 404);
        }
        await this.riotRepository.deleteByUserId(userId);
    }
}
