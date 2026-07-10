import { api } from "@/services/api";
import type { Lobby } from "../types/lobby.types";


export async function getLobby(leagueId: string, lobbyId: string) {
  const { data } = await api.get<Lobby>(`/leagues/${leagueId}/lobbies/${lobbyId}`);
  return data;
}

export async function toggleReady(leagueId: string, lobbyId: string) {
  const { data } = await api.patch<Lobby>(`/leagues/${leagueId}/lobbies/${lobbyId}/ready`);
  return data;
}

export async function changeTeam(leagueId: string, lobbyId: string, teamNumber?: string) {
  const { data } = await api.patch<Lobby>(`/leagues/${leagueId}/lobbies/${lobbyId}/team`, {
    teamNumber
  });

  return data;
}

export async function joinLobby(leagueId: string, lobbyId: string) {
  const { data } = await api.post(`/leagues/${leagueId}/lobbies/${lobbyId}/join`);
  return data;
}

export async function leaveLobby(leagueId: string, lobbyId: string) {
  await api.delete(`/leagues/${leagueId}/lobbies/${lobbyId}/leave`);
}
