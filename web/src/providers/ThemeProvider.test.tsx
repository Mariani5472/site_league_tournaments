import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "./ThemeProvider";
import { useTheme } from "./theme-context";

describe("ThemeProvider", () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.className = "";
    });

    it("persists an explicit dark preference and applies it to the document", () => {
        const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

        act(() => result.current.setTheme("dark"));

        expect(result.current.theme).toBe("dark");
        expect(localStorage.getItem("fpl-lol-theme")).toBe("dark");
        expect(document.documentElement).toHaveClass("dark");
        expect(document.documentElement.dataset.theme).toBe("dark");
    });
});
