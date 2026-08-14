import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { RouteLoadingFallback } from "./AppRoutes";

describe("route loading fallback", () => {
    test("announces lazy route loading to assistive technology", () => {
        render(<RouteLoadingFallback />);

        expect(screen.getByRole("status")).toHaveTextContent("Carregando página…");
        expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    });
});
