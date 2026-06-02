import { api } from "@/services/api";
import type { RiotAccount } from "../types/riotAccount";

export async function linkRiotAccount(info: {
  gameName: string;
  tagLine: string;
}) {
  const { data } = await api.post("/riot/link", info);
  return data;
}

export async function getMyRiotAccount() {
  const { data } = await api.get<RiotAccount | null>("/riot/me");
  return data;
}

export async function unlinkAccount() {
  return await api.delete("riot/me")
}