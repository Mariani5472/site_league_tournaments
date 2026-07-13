import { api } from "@/services/api";
import type { League } from "../types/league";
import type { LeagueMember } from "../types/member";
import type { LeagueRequest } from "../types/request";
import type { CreateLeagueInput } from "../types/createInput";
import type { Lobby } from "@/modules/lobbies/types/lobby.types";

export async function getMyLeagues() {
  const params = new URLSearchParams();
  params.set("membership", "member");

  const { data } = await api.get<League[]>(`/leagues?${params}`);
  return data;
}

export async function getLeague(leagueId: string) {
  const { data } = await api.get<League>(`/leagues/${leagueId}`,);
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

export async function joinLeague(leagueId: string) {
  const { data } = await api.post(`/leagues/${leagueId}/join`);
  return data;
}

export async function requestLeagueJoin(leagueId: string) {
  const { data } = await api.post(`/leagues/${leagueId}/requests`);
  return data;
}

export async function approveRequest(
  leagueId: string,
  requestId: string,
) {
  const { data } = await api.patch(`/leagues/${leagueId}/requests/${requestId}`, {
    status: "approved"
  });
  return data;
}

export async function rejectRequest(leagueId: string, requestId: string) {
  const { data } = await api.patch(`/leagues/${leagueId}/requests/${requestId}`, {
    status: "rejected"
  });
  return data;
}

export async function createLeague(input: CreateLeagueInput) {
  const { data } = await api.post(`/leagues`, input)
  return data;
}

export async function getPublicLeagues(search?: string) {
  const params = new URLSearchParams();
  if (search) {
    params.set("search", search);
  }

  const { data } = await api.get<League[]>(`/leagues?${params.toString()}`);
  return data;
}

export async function updateMemberRole(leagueId: string, memberId: string, role: string) {
  const { data } = await api.patch(`/leagues/${leagueId}/members/${memberId}/role`, role);
  return data;
}

export async function kickMember(leagueId: string, memberId: string) {
  return await api.delete(`/leagues/${leagueId}/members/${memberId}`);
}

export async function leaveLeague(leagueId: string) {
  return await api.delete(`/leagues/${leagueId}/leave`);
}

export async function deleteLeague(leagueId: string) {
  return await api.delete(`/leagues/${leagueId}`);
}

export async function updateLeague(leagueId: string, info: {
  name: string,
  description: string,
  visibility: string,
  join_policy: string,
  max_players: number,
}) {
  return await api.patch(`/leagues/${leagueId}`, info);
}

export async function getLeagueLobbies(leagueId: string) {
  const { data } = await api.get<Lobby[]>(`/leagues/${leagueId}/lobbies`);
  return data;
}

export async function createLobby(leagueId: string, data: { maxPlayers: number; }) {
  const response = await api.post(`/leagues/${leagueId}/lobbies`, { ...data });

  return response.data;
}