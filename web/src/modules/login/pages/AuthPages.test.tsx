import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useLocation } from "react-router-dom";
import { renderApp } from "@/test/renderApp";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { ResetPasswordPage } from "./ResetPasswordPage";

function LocationProbe() {
    return <output aria-label="location">{useLocation().pathname}</output>;
}

describe("authentication pages", () => {
    it("keeps login intent clear, supports password visibility and a safe returnTo", async () => {
        const signIn = vi.fn().mockResolvedValue(undefined);
        renderApp(
            <>
                <LoginPage />
                <LocationProbe />
            </>,
            {
                route: "/login?returnTo=%2Fleagues%2Fleague-1%3Ftab%3Dmembers",
                auth: { user: null, signIn },
            }
        );
        expect(screen.getByRole("heading", { name: "Entrar na sua conta" })).toBeVisible();
        const password = screen.getByLabelText("Senha");
        expect(password).toHaveAttribute("autocomplete", "current-password");
        expect(password).toHaveAttribute("type", "password");
        await userEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
        expect(password).toHaveAttribute("type", "text");
        await userEvent.type(screen.getByLabelText("E-mail"), "player@test.local");
        await userEvent.type(password, "correct horse battery staple");
        await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
        await waitFor(() =>
            expect(signIn).toHaveBeenCalledWith({
                email: "player@test.local",
                password: "correct horse battery staple",
            })
        );
        expect(screen.getByLabelText("location")).toHaveTextContent("/leagues/league-1");
    });

    it("never redirects login to an external returnTo", async () => {
        const signIn = vi.fn().mockResolvedValue(undefined);
        renderApp(
            <>
                <LoginPage />
                <LocationProbe />
            </>,
            { route: "/login?returnTo=https%3A%2F%2Fevil.test", auth: { user: null, signIn } }
        );
        await userEvent.type(screen.getByLabelText("E-mail"), "player@test.local");
        await userEvent.type(screen.getByLabelText("Senha"), "safe-password");
        await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
        await waitFor(() => expect(screen.getByLabelText("location")).toHaveTextContent("/main"));
    });

    it("rejects a short registration password and mismatched confirmation", async () => {
        const signUp = vi.fn();
        renderApp(<RegisterPage />, { route: "/register", auth: { user: null, signUp } });
        await userEvent.type(screen.getByLabelText("E-mail"), "new@test.local");
        await userEvent.type(screen.getByLabelText("Senha"), "123123");
        await userEvent.type(screen.getByLabelText("Confirmar senha"), "different-password");
        await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
        expect(await screen.findByText("Use pelo menos 10 caracteres")).toBeVisible();
        expect(screen.getByText("As senhas não coincidem")).toBeVisible();
        expect(signUp).not.toHaveBeenCalled();
        expect(screen.getByLabelText("Senha")).toHaveAttribute("autocomplete", "new-password");
    });

    it("shows email confirmation as a successful registration state", async () => {
        const signUp = vi
            .fn()
            .mockResolvedValue({ status: "confirmation_required", email: "new@test.local" });
        renderApp(<RegisterPage />, { route: "/register", auth: { user: null, signUp } });
        await userEvent.type(screen.getByLabelText("E-mail"), "new@test.local");
        await userEvent.type(screen.getByLabelText("Senha"), "long-password");
        await userEvent.type(screen.getByLabelText("Confirmar senha"), "long-password");
        await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
        expect(await screen.findByRole("status")).toHaveTextContent(
            "Enviamos um link de confirmação para new@test.local"
        );
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("covers recovery request and password reset success", async () => {
        const requestPasswordReset = vi.fn().mockResolvedValue(undefined);
        const forgot = renderApp(<ForgotPasswordPage />, {
            route: "/forgot-password",
            auth: { user: null, requestPasswordReset },
        });
        await userEvent.type(screen.getByLabelText("E-mail"), "player@test.local");
        await userEvent.click(screen.getByRole("button", { name: "Enviar link de recuperação" }));
        expect(await screen.findByRole("status")).toHaveTextContent("Se houver uma conta");
        expect(requestPasswordReset).toHaveBeenCalledWith("player@test.local");
        forgot.unmount();

        const updatePassword = vi.fn().mockResolvedValue(undefined);
        renderApp(<ResetPasswordPage />, {
            route: "/reset-password",
            auth: { user: null, updatePassword },
        });
        await userEvent.type(screen.getByLabelText("Nova senha"), "another-long-password");
        await userEvent.type(screen.getByLabelText("Confirmar senha"), "another-long-password");
        await userEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
        expect(await screen.findByRole("status")).toHaveTextContent("Senha atualizada com sucesso");
        expect(updatePassword).toHaveBeenCalledWith("another-long-password");
    });
});
