import { t } from ".";

const roleKeys = { owner: "enum.role.owner", admin: "enum.role.admin", player: "enum.role.player", spec: "enum.role.spec" } as const;
const visibilityKeys = { public: "enum.visibility.public", private: "enum.visibility.private" } as const;
const joinPolicyKeys = { open: "enum.joinPolicy.open", request: "enum.joinPolicy.request", invite_only: "enum.joinPolicy.invite_only" } as const;
const requestStatusKeys = { pending: "enum.requestStatus.pending", approved: "enum.requestStatus.approved", rejected: "enum.requestStatus.rejected" } as const;
const lobbyStatusKeys = { waiting: "enum.lobbyStatus.waiting", selecting: "enum.lobbyStatus.selecting", ready: "enum.lobbyStatus.ready", in_progress: "enum.lobbyStatus.in_progress", in_game: "enum.lobbyStatus.in_game", finished: "enum.lobbyStatus.finished", canceled: "enum.lobbyStatus.canceled", cancelled: "enum.lobbyStatus.cancelled" } as const;
const matchStatusKeys = { voting: "enum.matchStatus.voting", finished: "enum.matchStatus.finished", in_progress: "enum.matchStatus.in_progress", in_game: "enum.matchStatus.in_game", cancelled: "enum.matchStatus.cancelled" } as const;

function fromCatalog<T extends string>(value: T, keys: Partial<Record<T, Parameters<typeof t>[0]>>) {
    const key = keys[value];
    return key ? t(key) : value;
}

export const labelRole = (value: keyof typeof roleKeys) => t(roleKeys[value]);
export const labelVisibility = (value: keyof typeof visibilityKeys) => t(visibilityKeys[value]);
export const labelJoinPolicy = (value: keyof typeof joinPolicyKeys) => t(joinPolicyKeys[value]);
export const labelRequestStatus = (value: string) => fromCatalog(value, requestStatusKeys);
export const labelLobbyStatus = (value: string) => fromCatalog(value, lobbyStatusKeys);
export const labelMatchStatus = (value: string) => fromCatalog(value, matchStatusKeys);
export const labelResolution = (value: string) => value === "admin" ? t("enum.resolution.admin") : t("enum.resolution.vote");
