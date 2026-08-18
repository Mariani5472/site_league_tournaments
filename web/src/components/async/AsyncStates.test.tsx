import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { BackgroundRefresh } from "./BackgroundRefresh";
import { EmptyState } from "./EmptyState";
import { InlineError } from "./InlineError";
import { PageSkeleton } from "./PageSkeleton";

describe("async state components", () => {
    it("announces initial loading without rendering fake content", () => {
        render(<PageSkeleton />);

        expect(screen.getByText("Carregando página…")).toBeInTheDocument();
        expect(screen.getByText("Carregando página…").parentElement).toHaveAttribute(
            "aria-busy",
            "true"
        );
    });

    it("keeps background refresh as a separate textual status", () => {
        const { rerender } = render(<BackgroundRefresh active={false} />);
        expect(screen.queryByRole("status")).not.toBeInTheDocument();

        rerender(<BackgroundRefresh active />);
        expect(screen.getByRole("status")).toHaveTextContent("Atualizando em segundo plano…");
    });

    it("exposes errors and retry through accessible controls", async () => {
        const retry = vi.fn();
        render(<InlineError message="Não foi possível carregar." retry={retry} />);

        expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar.");
        await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
        expect(retry).toHaveBeenCalledOnce();
    });

    it("renders an empty state with a meaningful heading", () => {
        render(<EmptyState title="Nenhum resultado" description="Tente outra busca." />);

        expect(screen.getByRole("heading", { name: "Nenhum resultado" })).toBeVisible();
        expect(screen.getByText("Tente outra busca.")).toBeVisible();
    });
});
