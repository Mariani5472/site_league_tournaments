import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";
import { renderApp } from "@/test/renderApp";
import { ApiError, mutationErrorMessage } from "@/services/api-errors";
import { DangerZone } from "./DangerZone";
import { deleteLeague } from "../services/leagues.service";
import { toast } from "sonner";

vi.mock("../services/leagues.service", () => ({ deleteLeague: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function subject() {
    return <Routes>
        <Route path="/leagues/league-1/settings" element={<DangerZone leagueId="league-1" leagueName="Champions" />} />
        <Route path="/leagues" element={<p>League list</p>} />
    </Routes>;
}

describe("DangerZone", () => {
    beforeEach(() => {
        vi.mocked(deleteLeague).mockReset();
    });

    it("requires the exact league name before deleting and closes only after success", async () => {
        const user = userEvent.setup();
        let resolveDelete!: () => void;
        vi.mocked(deleteLeague).mockReturnValue(new Promise<Awaited<ReturnType<typeof deleteLeague>>>((resolve) => {
            resolveDelete = () => resolve({} as Awaited<ReturnType<typeof deleteLeague>>);
        }));
        renderApp(subject(), { route: "/leagues/league-1/settings" });

        await user.click(screen.getByRole("button", { name: "Excluir liga" }));
        const confirmButton = screen.getByRole("button", { name: /excluir liga permanentemente/i });
        expect(confirmButton).toBeDisabled();

        await user.type(screen.getByLabelText(/confirmação pelo nome da liga/i), "Wrong name");
        expect(confirmButton).toBeDisabled();
        expect(deleteLeague).not.toHaveBeenCalled();

        await user.clear(screen.getByLabelText(/confirmação pelo nome da liga/i));
        await user.type(screen.getByLabelText(/confirmação pelo nome da liga/i), "Champions");
        await user.click(confirmButton);

        expect(deleteLeague).toHaveBeenCalledOnce();
        expect(screen.getByRole("dialog")).toBeVisible();
        expect(screen.getByRole("button", { name: "Excluindo…" })).toBeDisabled();

        resolveDelete();
        expect(await screen.findByText("League list")).toBeVisible();
        expect(toast.success).toHaveBeenCalledOnce();
        expect(toast.error).not.toHaveBeenCalled();
    });

    it("keeps the dialog open and shows one consistent error toast", async () => {
        const user = userEvent.setup();
        vi.mocked(deleteLeague).mockRejectedValue(new ApiError("internal detail", 500, "INTERNAL_ERROR"));
        renderApp(subject(), { route: "/leagues/league-1/settings" });

        await user.click(screen.getByRole("button", { name: "Excluir liga" }));
        await user.type(screen.getByLabelText(/confirmação pelo nome da liga/i), "Champions");
        await user.click(screen.getByRole("button", { name: /excluir liga permanentemente/i }));

        expect(await screen.findByRole("dialog")).toBeVisible();
        expect(toast.error).toHaveBeenCalledOnce();
        expect(toast.error).toHaveBeenCalledWith("Ocorreu um erro inesperado no servidor. Tente novamente.");
        expect(toast.success).not.toHaveBeenCalled();
    });
});

describe("critical mutation error messages", () => {
    it.each([
        [403, "forbidden", "Você não tem permissão para realizar esta ação."],
        [404, "missing", "O recurso solicitado não foi encontrado."],
        [409, "Transfer ownership first.", "Esta ação conflita com o estado atual. Atualize a página e tente novamente."],
        [500, "database detail", "Ocorreu um erro inesperado no servidor. Tente novamente."],
    ])("maps HTTP %s consistently", (status, detail, expected) => {
        expect(mutationErrorMessage(new ApiError(detail, status))).toBe(expected);
    });
});
