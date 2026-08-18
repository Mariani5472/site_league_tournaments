import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LandingPage } from "./LandingPage";
import { renderApp } from "@/test/renderApp";

describe("LandingPage", () => {
    it("identifies the mock, explains the product loop and ends with real project links", () => {
        renderApp(<LandingPage />);

        expect(screen.getByText("Demonstração da experiência")).toBeVisible();
        expect(screen.getByText("Como funciona um lobby")).toBeVisible();
        expect(
            screen.getByRole("progressbar", { name: "8 de 10 jogadores no lobby" })
        ).toHaveAttribute("aria-valuenow", "8");
        expect(screen.getByText("Entre ou crie uma liga")).toBeVisible();
        expect(screen.getByText("Acompanhe a classificação")).toBeVisible();
        expect(screen.getByRole("link", { name: /criar minha conta/i })).toHaveAttribute(
            "href",
            "/register"
        );
        expect(screen.getByRole("link", { name: /github/i })).toHaveAttribute(
            "href",
            "https://github.com/Mariani5472/site_league_tournaments"
        );
        expect(screen.queryByText(/termos|privacidade/i)).not.toBeInTheDocument();
    });
});
