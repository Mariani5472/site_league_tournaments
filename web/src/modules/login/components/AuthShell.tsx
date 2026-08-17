import type { ReactNode } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { t } from "@/i18n";

export function AuthShell({ children }: { children: ReactNode }) {
    return (
        <main className="grid min-h-screen bg-muted/30 lg:grid-cols-2">
            <section className="hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
                <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-primary">
                        L
                    </span>
                    ligas
                </Link>
                <div className="max-w-lg space-y-5">
                    <ShieldCheck className="h-10 w-10 text-white" />
                    <h1 className="text-5xl font-bold leading-tight text-white">
                        {t("auth.heroTitle")}
                    </h1>
                    <p className="text-lg text-white/80">{t("auth.heroDescription")}</p>
                </div>
                <p className="text-sm text-white/70">{t("auth.heroFooter")}</p>
            </section>
            <section className="flex items-center justify-center p-5 sm:p-10">
                <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-xl sm:p-9">
                    <Link
                        to="/"
                        className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <ArrowLeft className="h-4 w-4" /> {t("common.back")}
                    </Link>
                    {children}
                </div>
            </section>
        </main>
    );
}
