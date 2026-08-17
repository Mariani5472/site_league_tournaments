import { api } from "@/services/api";
import type { RiotAccount } from "../types/riotAccount";
export type RiotConfiguration = {
    enabled: boolean;
    region: string | null;
};
export async function getRiotConfiguration() {
    const { data } = await api.get<RiotConfiguration>("/riot/config");
    return data;
}
export async function linkRiotAccount(info: { gameName: string; tagLine: string }) {
    const { data } = await api.post("/riot", info);
    return data;
}
export async function getMyRiotAccount() {
    const { data } = await api.get<RiotAccount | null>("/riot");
    return data;
}
export async function unlinkAccount() {
    return await api.delete("/riot");
}
