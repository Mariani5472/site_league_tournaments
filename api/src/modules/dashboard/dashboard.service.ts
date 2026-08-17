import { DashboardRepository } from "./dashboard.repository";
import type { DashboardAction, DashboardResponse } from "./dashboard.types";

export class DashboardService {
    constructor(private readonly repository = new DashboardRepository()) {}
    async get(userId: string): Promise<DashboardResponse> {
        const [summary, actionRows, recentLeagues, recentMatches] = await Promise.all([
            this.repository.getSummary(userId),
            this.repository.listActions(userId),
            this.repository.listRecentLeagues(userId),
            this.repository.listRecentMatches(userId),
        ]);
        const actions = actionRows.map(({ priority: _priority, occurredAt: _occurredAt, ...action }): DashboardAction => ({
            ...action,
            href: action.type === "admin_requests"
                ? `/leagues/${action.leagueId}`
                : `/leagues/${action.leagueId}/lobbies/${action.lobbyId}`,
        }));
        return { summary, actions, recentLeagues, recentMatches };
    }
}
