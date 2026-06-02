import axios, { AxiosInstance, get } from "axios";

export class RiotClient {
  private readonly token = process.env.RIOT_DEVELOPMENT_API_KEY!;
  private readonly region = process.env.RIOT_REGION!;
  private getClient(): AxiosInstance {
    return axios.create({
      baseURL: `https://${this.region}.api.riotgames.com`,
      headers: { "X-Riot-Token": this.token }
    })
  }

  async getAccountByRiotId(gameName: string, tagLine: string) {
    console.log(gameName, tagLine)
    const { data } = await this.getClient()
      .get(`/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`);
    return data;
  }

  async getSummonerByPuuid(puuid: string) {
    const { data } = await this.getClient()
      .get(`/lol/summoner/v4/summoners/by-puuid/${puuid}`);
    return data;
  }

}