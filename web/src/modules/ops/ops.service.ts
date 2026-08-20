import { api } from "@/services/api";
import type {
    OpsLeagueDetail,
    OpsLeaguesPage,
    OpsSession,
    OpsUserDetail,
    OpsUsersPage,
} from "./types";

export async function getOpsSession() {
    return (await api.get<OpsSession>("/ops/session")).data;
}

export async function listOpsUsers(search: string, cursor?: string) {
    return (
        await api.get<OpsUsersPage>("/ops/users", {
            params: { search: search || undefined, cursor, limit: 20 },
        })
    ).data;
}

export async function getOpsUser(userId: string) {
    return (await api.get<OpsUserDetail>(`/ops/users/${userId}`)).data;
}

export async function listOpsLeagues(search: string, cursor?: string) {
    return (
        await api.get<OpsLeaguesPage>("/ops/leagues", {
            params: { search: search || undefined, cursor, limit: 20 },
        })
    ).data;
}

export async function getOpsLeague(leagueId: string) {
    return (await api.get<OpsLeagueDetail>(`/ops/leagues/${leagueId}`)).data;
}
