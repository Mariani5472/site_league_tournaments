import type { CursorParams } from "../../@types/shared/CursorPage";

export type OpsUserListParams = CursorParams & {
    search: string;
    platformRole?: "super_admin" | "none";
};

export type OpsLeagueListParams = CursorParams & {
    search: string;
    visibility?: "public" | "private";
    operationalStatus?: "active" | "idle";
};
