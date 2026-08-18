import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateLeagueDialog } from "@/modules/leagues/components/CreateLeagueDialog";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/i18n";

export function FirstLoginOnboarding() {
    const { user } = useAuth();
    const storageKey = `fpl-lol-onboarding:${user?.id ?? "anonymous"}`;
    const [visible, setVisible] = useState(() => localStorage.getItem(storageKey) !== "done");

    if (!visible) return null;
    const dismiss = () => {
        localStorage.setItem(storageKey, "done");
        setVisible(false);
    };
    return (
        <section
            className="rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:p-6"
            aria-labelledby="onboarding-title"
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-primary">{t("onboarding.eyebrow")}</p>
                    <h2 id="onboarding-title" className="mt-1 text-xl font-bold">
                        {t("onboarding.title")}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t("onboarding.description")}
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={dismiss}
                    aria-label={t("onboarding.dismiss")}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Button variant="outline" asChild>
                    <Link to="/profile">
                        <UserRound className="h-4 w-4" />
                        {t("onboarding.profile")}
                    </Link>
                </Button>
                <CreateLeagueDialog>
                    <Button>{t("onboarding.createLeague")}</Button>
                </CreateLeagueDialog>
                <Button variant="outline" asChild>
                    <Link to="/leagues">
                        <Search className="h-4 w-4" />
                        {t("onboarding.discoverLeague")}
                    </Link>
                </Button>
            </div>
        </section>
    );
}
