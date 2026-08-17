import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/renderApp";
import { ApiError } from "@/services/api-errors";
import { LeagueRequests } from "./LeagueRequests";
import { approveRequest, rejectRequest } from "../services/leagues.service";
import { toast } from "sonner";

vi.mock("../services/leagues.service", () => ({
    approveRequest: vi.fn(),
    rejectRequest: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const request = {
    id: "request-1",
    nickname: "Player",
    status: "pending",
} as Parameters<typeof LeagueRequests>[0]["requests"][number];

describe("LeagueRequests mutation feedback", () => {
    beforeEach(() => {
        vi.mocked(approveRequest).mockReset();
        vi.mocked(rejectRequest).mockReset();
    });

    it.each([
        ["Aprovar", approveRequest],
        ["Recusar", rejectRequest],
    ])("shows one visible error when %s fails", async (label, service) => {
        const user = userEvent.setup();
        vi.mocked(service).mockRejectedValue(new ApiError("not allowed", 403, "FORBIDDEN"));
        renderApp(<LeagueRequests leagueId="league-1" requests={[request]} />);

        await user.click(screen.getByRole("button", { name: label }));

        expect(toast.error).toHaveBeenCalledOnce();
        expect(toast.error).toHaveBeenCalledWith("Você não tem permissão para realizar esta ação.");
        expect(toast.success).not.toHaveBeenCalled();
    });
});
