import { api } from "@/services/api";
import type { Lobby, LobbyDetails, TeamSelectionMode } from "../types/lobby.types";
export async function getLobby(leagueId: string, lobbyId: string) {
    const { data } = await api.get<LobbyDetails>(`/leagues/${leagueId}/lobbies/${lobbyId}`);
    return data;
}
export async function toggleReady(leagueId: string, lobbyId: string) {
    const { data } = await api.patch<Lobby>(`/leagues/${leagueId}/lobbies/${lobbyId}/ready`);
    return data;
}
export async function toggleUnready(leagueId: string, lobbyId: string) {
    const { data } = await api.patch<Lobby>(`/leagues/${leagueId}/lobbies/${lobbyId}/unready`);
    return data;
}
export async function changeTeam(leagueId: string, lobbyId: string, teamNumber?: number) {
    const { data } = await api.patch<Lobby>(`/leagues/${leagueId}/lobbies/${lobbyId}/team`, {
        teamNumber: teamNumber,
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
export async function deleteLobby(leagueId: string, lobbyId: string) {
    await api.post(`/leagues/${leagueId}/lobbies/${lobbyId}/cancel`);
}
export async function startLobby(leagueId: string, lobbyId: string) {
    return (
        await api.post<{
            id: string;
        }>(`/leagues/${leagueId}/lobbies/${lobbyId}/start`)
    ).data;
}
export async function voteTeamSelection(
    leagueId: string,
    lobbyId: string,
    mode: TeamSelectionMode
) {
    return (
        await api.post<LobbyDetails>(
            `/leagues/${leagueId}/lobbies/${lobbyId}/team-selection/vote`,
            { mode }
        )
    ).data;
}
export async function draftPick(leagueId: string, lobbyId: string, userId: string) {
    return (
        await api.post<LobbyDetails>(
            `/leagues/${leagueId}/lobbies/${lobbyId}/team-selection/pick`,
            { userId: userId }
        )
    ).data;
}
export async function confirmTeamSelection(
    leagueId: string,
    lobbyId: string,
    decision: "accept" | "reroll"
) {
    return (
        await api.post<LobbyDetails>(
            `/leagues/${leagueId}/lobbies/${lobbyId}/team-selection/confirm`,
            { decision }
        )
    ).data;
}
export async function voteCaptain(leagueId: string, lobbyId: string, candidateId: string) {
    return (
        await api.post<LobbyDetails>(
            `/leagues/${leagueId}/lobbies/${lobbyId}/team-selection/captain-vote`,
            { candidateId: candidateId }
        )
    ).data;
}
export async function finalizeCaptains(leagueId: string, lobbyId: string) {
    return (
        await api.post<LobbyDetails>(
            `/leagues/${leagueId}/lobbies/${lobbyId}/team-selection/captains/finalize`
        )
    ).data;
}
