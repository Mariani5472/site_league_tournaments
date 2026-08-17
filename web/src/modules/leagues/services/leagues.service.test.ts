import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api";
import {
    getDiscoverLeagues,
    getLeagueMembers,
    getLeagueRequests,
    leaveLeague,
    updateMemberRole,
} from "./leagues.service";

vi.mock("@/services/api", () => ({
    api: {
        delete: vi.fn(),
        patch: vi.fn(),
        get: vi.fn(),
    },
}));

describe("league member service contracts", () => {
    beforeEach(() => {
        vi.mocked(api.delete).mockResolvedValue({ data: undefined });
        vi.mocked(api.patch).mockResolvedValue({ data: { role: "admin" } });
    });

    it("leaves through the authenticated member endpoint", async () => {
        await leaveLeague("league-1");

        expect(api.delete).toHaveBeenCalledWith("/leagues/league-1/members/me");
    });

    it("sends role updates using the API body schema", async () => {
        await expect(updateMemberRole("league-1", "member-1", "admin")).resolves.toEqual({
            role: "admin",
        });

        expect(api.patch).toHaveBeenCalledWith("/leagues/league-1/members/member-1", {
            role: "admin",
        });
    });

    it("preserves items and nextCursor and sends each cursor to the API", async () => {
        const page = { items: [{ id: "item-1" }], nextCursor: "cursor-1" };
        vi.mocked(api.get).mockResolvedValue({ data: page });

        await expect(getDiscoverLeagues("ranked", "cursor-0", 20)).resolves.toEqual(page);
        await expect(getLeagueMembers("league-1", "cursor-0", 20)).resolves.toEqual(page);
        await expect(getLeagueRequests("league-1", "cursor-0", 20)).resolves.toEqual(page);

        expect(api.get).toHaveBeenNthCalledWith(
            1,
            "/leagues/discover?search=ranked&cursor=cursor-0&limit=20"
        );
        expect(api.get).toHaveBeenNthCalledWith(
            2,
            "/leagues/league-1/members?limit=20&cursor=cursor-0"
        );
        expect(api.get).toHaveBeenNthCalledWith(
            3,
            "/leagues/league-1/requests?limit=20&status=pending&cursor=cursor-0"
        );
    });
});
