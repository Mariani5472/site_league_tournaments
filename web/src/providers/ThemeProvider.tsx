import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeContext, type ResolvedTheme, type ThemePreference } from "./theme-context";

const STORAGE_KEY = "fpl-lol-theme";
function systemTheme(): ResolvedTheme {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function storedTheme(): ThemePreference {
    let value: string | null;
    try {
        value = localStorage.getItem(STORAGE_KEY);
    } catch {
        return "system";
    }
    return value === "light" || value === "dark" || value === "system" ? value : "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<ThemePreference>(storedTheme);
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
        theme === "system" ? systemTheme() : theme
    );

    useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const apply = () => {
            const resolved = theme === "system" ? (media.matches ? "dark" : "light") : theme;
            document.documentElement.classList.toggle("dark", resolved === "dark");
            document.documentElement.dataset.theme = resolved;
            document.documentElement.style.colorScheme = resolved;
            setResolvedTheme(resolved);
        };
        apply();
        media.addEventListener("change", apply);
        return () => media.removeEventListener("change", apply);
    }, [theme]);

    const value = useMemo(
        () => ({
            theme,
            resolvedTheme,
            setTheme(nextTheme: ThemePreference) {
                try {
                    localStorage.setItem(STORAGE_KEY, nextTheme);
                } catch {
                    // The in-memory preference still works when storage is unavailable.
                }
                setThemeState(nextTheme);
            },
        }),
        [resolvedTheme, theme]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
