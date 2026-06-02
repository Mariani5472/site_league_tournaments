import { RiotClient } from "./riot.client";
import { RiotRepository } from "./riot.repository";

export class RiotService {
  private riotClient = new RiotClient();
  private riotRepository = new RiotRepository();

  async getMyAccount(userId: string) {
    const account = await this.riotRepository.findByUserId(userId);

    return account ?? null;
  }

  async linkAccount(params: {
    userId: string;
    gameName: string;
    tagLine: string;
  }) {
    const account = await this.riotClient.getAccountByRiotId(
      params.gameName,
      params.tagLine
    );

    const existingPuuid = await this.riotRepository.findByPuuid(
      account.puuid
    );

    if (existingPuuid) {
      throw new Error("Riot account already linked");
    }

    const existingUser = await this.riotRepository.findByUserId(
      params.userId
    );

    if (existingUser) {
      throw new Error("User already linked a Riot account");
    }

    const riotAccount = await this.riotRepository.create({
      userId: params.userId,
      gameName: account.gameName,
      tagLine: account.tagLine,
      puuid: account.puuid,
      region: "americas"
    });

    return riotAccount;
  }

  async unlinkAccount(userId: string) {
    const account = await this.riotRepository.findByUserId(userId);

    if (!account) {
      throw new Error("No Riot account linked");
    }

    await this.riotRepository.deleteByUserId(userId);
  }
}