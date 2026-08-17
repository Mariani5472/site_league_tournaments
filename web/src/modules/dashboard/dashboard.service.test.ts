import { describe, expect, it, vi } from "vitest";
import { api } from "@/services/api";
import { getDashboard } from "./dashboard.service";

vi.mock("@/services/api", () => ({ api: { get: vi.fn() } }));

describe("dashboard service", () => {
    it("loads the entire dashboard through one aggregate request", async () => {
        const data = { summary: {}, actions: [], recentLeagues: [], recentMatches: [] };
        vi.mocked(api.get).mockResolvedValue({ data });
        await expect(getDashboard()).resolves.toBe(data);
        expect(api.get).toHaveBeenCalledOnce();
        expect(api.get).toHaveBeenCalledWith("/dashboard");
    });
});
