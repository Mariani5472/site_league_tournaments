import { Laptop, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme, type ThemePreference } from "@/providers/ThemeProvider";
import { t } from "@/i18n";

const order: ThemePreference[] = ["light", "dark", "system"];
const icons = { light: Sun, dark: Moon, system: Laptop };

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const Icon = icons[theme];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setTheme(next)}
            title={t(`theme.${theme}`)}
            aria-label={t("theme.change", { theme: t(`theme.${theme}`) })}
        >
            <Icon className="h-4 w-4" aria-hidden="true" />
        </Button>
    );
}
