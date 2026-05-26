import { api } from "@/services/api";
import type { League } from "../types/league";
import type { LeagueMember } from "../types/member";
import type { LeagueRequest } from "../types/request";

export async function getMyLeagues() {
  const { data } = await api.get<League[]>("/leagues/my");
  return data;
}

export async function getLeague(leagueId: string) {
  const { data } = await api.get<League>(`/leagues/${leagueId}`);
  return data;
}

export async function getLeagueMembers(leagueId: string) {
  const { data } = await api.get<LeagueMember[]>(`/leagues/${leagueId}/members`);
  return data;
}

export async function getLeagueRequests(leagueId: string) {
  const { data } = await api.get<LeagueRequest[]>(`/leagues/${leagueId}/requests`);
  return data;
}

export async function approveRequest(leagueId: string, requestId: string) {
  const { data } = await api.post(`/leagues/${leagueId}/requests/${requestId}/approve`);
  return data;
}

export async function rejectRequest(leagueId: string, requestId: string) {
  const { data } = await api.post(`/leagues/${leagueId}/requests/${requestId}/reject`);
  return data;
}