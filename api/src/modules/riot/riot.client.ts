import axios, { AxiosInstance } from "axios";
export class RiotClient {
    constructor(private readonly token: string, private readonly region: string) { }
    private getClient(): AxiosInstance {
        return axios.create({
            baseURL: `https://${this.region}.api.riotgames.com`,
            headers: { "X-Riot-Token": this.token }
        });
    }
    async getAccountByRiotId(gameName: string, tagLine: string) {
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
