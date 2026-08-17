import { ArrowRight, CheckCircle2, ShieldCheck, Swords, Trophy, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
const features = [
    {
        icon: Users,
        title: t("landing.feature.leagues.title"),
        text: t("landing.feature.leagues.text"),
    },
    {
        icon: Swords,
        title: t("landing.feature.matches.title"),
        text: t("landing.feature.matches.text"),
    },
    {
        icon: Trophy,
        title: t("landing.feature.ranking.title"),
        text: t("landing.feature.ranking.text"),
    },
];
export function LandingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
                    <Link to="/" className="flex items-center gap-2 text-lg font-bold">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
                            L
                        </span>
                        ligas
                    </Link>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" asChild>
                            <Link to="/login">{t("auth.login")}</Link>
                        </Button>
                        <Button asChild>
                            <Link to="/login">{t("auth.createAccount")}</Link>
                        </Button>
                    </div>
                </div>
            </header>
            <main>
                <section className="relative overflow-hidden border-b">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-primary),transparent_38%)] opacity-10" />
                    <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
                        <div className="space-y-7">
                            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm font-medium text-primary">
                                <ShieldCheck className="h-4 w-4" /> {t("landing.tagline")}
                            </span>
                            <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
                                {t("landing.title")}
                                <br />
                                <span className="text-primary">{t("landing.titleHighlight")}</span>
                            </h1>
                            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                                {t("landing.description")}
                            </p>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Button size="lg" asChild>
                                    <Link to="/login">
                                        {t("landing.start")} <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                                <Button size="lg" variant="outline" asChild>
                                    <a href="#recursos">{t("landing.features")}</a>
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                                {[
                                    t("landing.benefit.riot"),
                                    t("landing.benefit.vote"),
                                    t("landing.benefit.realtime"),
                                ].map(item => (
                                    <span key={item} className="flex items-center gap-1.5">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-3xl border bg-card p-5 shadow-xl shadow-primary/10">
                            <div className="rounded-2xl bg-primary p-6 text-primary-foreground">
                                <p className="text-sm opacity-80">{t("landing.nextMatch")}</p>
                                <h2 className="mt-2 text-2xl font-bold text-white">
                                    Liga do Dev 5x5
                                </h2>
                                <div className="mt-8 grid grid-cols-2 gap-3">
                                    {[1, 2].map(team => (
                                        <div key={team} className="rounded-xl bg-white/10 p-4">
                                            <p className="text-sm opacity-80">
                                                {t("common.team", { number: team })}
                                            </p>
                                            <p className="mt-1 text-2xl font-bold">5</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                <section id="recursos" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
                    <div className="mb-10 max-w-2xl">
                        <p className="font-semibold text-primary">{t("landing.flow")}</p>
                        <h2 className="mt-2 text-3xl font-bold">{t("landing.flowTitle")}</h2>
                    </div>
                    <div className="grid gap-5 md:grid-cols-3">
                        {features.map(({ icon: Icon, title, text }) => (
                            <article
                                key={title}
                                className="rounded-2xl border bg-card p-6 shadow-sm"
                            >
                                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                                    <Icon className="h-5 w-5" />
                                </span>
                                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                    {text}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
