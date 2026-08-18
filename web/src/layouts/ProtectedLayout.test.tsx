import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { renderApp } from "@/test/renderApp";
import { ProtectedLayout } from "./ProtectedLayout";

function routes() {
    return (
        <Routes>
            <Route path="/" element={<p>Public landing</p>} />
            <Route path="/login" element={<p>Login page</p>} />
            <Route element={<ProtectedLayout />}>
                <Route path="/private" element={<p>Private content</p>} />
            </Route>
        </Routes>
    );
}

describe("ProtectedLayout", () => {
    it("redirects an unauthenticated user to login preserving returnTo", async () => {
        renderApp(routes(), { route: "/private", auth: { user: null } });
        expect(await screen.findByText("Login page")).toBeVisible();
        expect(screen.queryByText("Private content")).not.toBeInTheDocument();
    });

    it("does not render private content while session initialization is loading", () => {
        renderApp(routes(), { route: "/private", auth: { user: null, loading: true } });
        expect(screen.getByText("Carregando…")).toBeVisible();
        expect(screen.queryByText("Private content")).not.toBeInTheDocument();
    });

    it("renders protected content for an authenticated user", () => {
        renderApp(routes(), { route: "/private" });
        expect(screen.getByText("Private content")).toBeVisible();
        expect(screen.getByRole("link", { name: "Ir para o conteúdo principal" })).toHaveAttribute(
            "href",
            "#main-content"
        );
    });

    it("exposes mobile menu state and closes it with Escape", async () => {
        renderApp(routes(), { route: "/private" });
        const trigger = screen.getByRole("button", { name: "Abrir menu" });

        expect(trigger).toHaveAttribute("aria-controls", "application-sidebar");
        expect(trigger).toHaveAttribute("aria-expanded", "false");
        await userEvent.click(trigger);
        expect(trigger).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByRole("button", { name: "Fechar menu" })).toHaveFocus();

        await userEvent.keyboard("{Escape}");
        expect(trigger).toHaveAttribute("aria-expanded", "false");
        expect(trigger).toHaveFocus();
    });
});
