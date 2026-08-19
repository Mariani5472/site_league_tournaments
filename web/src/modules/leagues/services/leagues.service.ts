import { api } from "@/services/api";
import type { League } from "../types/league";
import type { LeagueMember } from "../types/member";
import type { LeagueRequest } from "../types/request";
import type { LeagueInvitation } from "../types/invitation";
import type { CreateLeagueInput } from "../types/createInput";
import type { Lobby } from "@/modules/lobbies/types/lobby.types";
import type { CursorPage } from "@/types/pagination";
const PAGE_LIMIT = 50;
export async function getMineLeagues() {
    const { data } = await api.get<League[]>(`/leagues/mine`);
    return data;
}
export async function getDiscoverLeagues(search?: string, cursor?: string, limit = PAGE_LIMIT) {
    const params = new URLSearchParams();
    if (search) {
        params.set("search", search);
    }
    if (cursor) params.set("cursor", cursor);
    params.set("limit", String(limit));
    const { data } = await api.get<CursorPage<League>>(`/leagues/discover?${params.toString()}`);
    return data;
}
export async function getLeague(leagueId: string) {
    const { data } = await api.get<League>(`/leagues/${leagueId}`);
    return data;
}
export async function getLeagueMembers(leagueId: string, cursor?: string, limit = PAGE_LIMIT) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    const { data } = await api.get<CursorPage<LeagueMember>>(
        `/leagues/${leagueId}/members?${params.toString()}`
    );
    return data;
}
export async function getLeagueRequests(leagueId: string, cursor?: string, limit = PAGE_LIMIT) {
    const params = new URLSearchParams({ limit: String(limit), status: "pending" });
    if (cursor) params.set("cursor", cursor);
    const { data } = await api.get<CursorPage<LeagueRequest>>(
        `/leagues/${leagueId}/requests?${params.toString()}`
    );
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
export async function approveRequest(leagueId: string, requestId: string) {
    const { data } = await api.patch(`/leagues/${leagueId}/requests/${requestId}`, {
        status: "approved",
    });
    return data;
}
export async function rejectRequest(leagueId: string, requestId: string) {
    const { data } = await api.patch(`/leagues/${leagueId}/requests/${requestId}`, {
        status: "rejected",
    });
    return data;
}

export async function getMyInvitations(cursor?: string, limit = PAGE_LIMIT) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return (await api.get<CursorPage<LeagueInvitation>>(`/invitations?${params}`)).data;
}

export async function invitePlayer(leagueId: string, recipientId: string) {
    return (await api.post<LeagueInvitation>(`/leagues/${leagueId}/invitations`, { recipientId }))
        .data;
}

export async function respondToInvitation(invitationId: string, status: "accepted" | "rejected") {
    return (await api.patch<LeagueInvitation>(`/invitations/${invitationId}`, { status })).data;
}
export async function createLeague(input: CreateLeagueInput) {
    const { data } = await api.post(`/leagues`, input);
    return data;
}
export async function updateMemberRole(leagueId: string, memberId: string, role: string) {
    const { data } = await api.patch(`/leagues/${leagueId}/members/${memberId}`, { role });
    return data;
}
export async function kickMember(leagueId: string, memberId: string) {
    return await api.delete(`/leagues/${leagueId}/members/${memberId}`);
}
export async function leaveLeague(leagueId: string) {
    return await api.delete(`/leagues/${leagueId}/members/me`);
}
export async function deleteLeague(leagueId: string) {
    return await api.delete(`/leagues/${leagueId}`);
}
export async function updateLeague(
    leagueId: string,
    info: {
        name: string;
        description: string;
        visibility: string;
        joinPolicy: string;
        maxPlayers: number;
        lobbyCreationPolicy: "admins" | "members";
        autoStartLobby: boolean;
    }
) {
    return await api.patch(`/leagues/${leagueId}`, info);
}
export async function getLeagueLobbies(leagueId: string) {
    const { data } = await api.get<Lobby[]>(`/leagues/${leagueId}/lobbies`);
    return data;
}
export async function createLobby(
    leagueId: string,
    data: {
        maxPlayers: number;
    }
) {
    const response = await api.post(`/leagues/${leagueId}/lobbies`, { ...data });
    return response.data;
}
