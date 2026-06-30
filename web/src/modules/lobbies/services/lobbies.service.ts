import { api } from "@/services/api";
import type { Lobby } from "../types/lobby.types";


export async function getLobby(lobbyId: string) {
  const { data } = await api.get<Lobby>(`/lobbies/${lobbyId}`);
  return data;
}

export async function toggleReady(lobbyId: string) {
  const { data } = await api.patch<Lobby>(`/lobbies/${lobbyId}/ready`);
  return data;
}

export async function changeTeam(lobbyId: string, teamNumber?: string) {
  const { data } = await api.patch<Lobby>(`/lobbies/${lobbyId}/ready`, {
    teamNumber
  });

  return data;
}

export async function joinLobby(lobbyId: string) {
  const { data } = await api.post(`/lobbies/${lobbyId}/join`);
  return data;
}

export async function leaveLobby(lobbyId: string) {
  await api.delete(`/lobbies/${lobbyId}/leave`);
}
