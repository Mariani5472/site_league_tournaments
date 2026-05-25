import { api } from "@/services/api";
import type { League } from "../types/league";

export async function getMyLeagues() {
  const { data } = await api.get<League[]>("/leagues/my");
  return data;
}