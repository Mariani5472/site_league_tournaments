import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "@/test/renderApp";
import { HttpStatusPage } from "./HttpStatusPage";

describe("HttpStatusPage", () => {
    it.each([
        ["notFound", "404", "Página não encontrada"],
        ["forbidden", "403", "Acesso não permitido"],
        ["sessionExpired", "401", "Sua sessão expirou"],
    ] as const)("explains the %s state", (kind, code, title) => {
        renderApp(<HttpStatusPage kind={kind} />);

        expect(screen.getByText(code)).toBeVisible();
        expect(screen.getByRole("heading", { name: title })).toBeVisible();
        expect(screen.getByRole("link")).toBeVisible();
    });
});
