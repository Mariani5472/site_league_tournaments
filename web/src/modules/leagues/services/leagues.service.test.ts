import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api";
import { leaveLeague, updateMemberRole } from "./leagues.service";

vi.mock("@/services/api", () => ({
    api: {
        delete: vi.fn(),
        patch: vi.fn(),
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
        await expect(updateMemberRole("league-1", "member-1", "admin"))
            .resolves.toEqual({ role: "admin" });

        expect(api.patch).toHaveBeenCalledWith(
            "/leagues/league-1/members/member-1",
            { role: "admin" }
        );
    });
});
