import {
    ArrowRight,
    CheckCircle2,
    Code2,
    ShieldCheck,
    Swords,
    Trophy,
    Users,
    Vote,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { ThemeToggle } from "@/components/ThemeToggle";
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
const productLoop = [
    [Users, "landing.loop.league"],
    [Swords, "landing.loop.lobby"],
    [CheckCircle2, "landing.loop.ready"],
    [Trophy, "landing.loop.match"],
    [Vote, "landing.loop.vote"],
    [Trophy, "landing.loop.standings"],
] as const;
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
                        <ThemeToggle />
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
                                        <CheckCircle2 className="h-4 w-4 text-success" />
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-3xl border bg-card p-5 shadow-xl shadow-primary/10">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t("landing.demoLabel")}
                            </p>
                            <div className="rounded-2xl border bg-muted/35 p-5 sm:p-6">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-2xl font-bold">
                                            {t("landing.lobbyDemo.title")}
                                        </h2>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {t("landing.lobbyDemo.description")}
                                        </p>
                                    </div>
                                    <span className="rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-medium text-warning-foreground dark:text-warning">
                                        {t("landing.lobbyDemo.gathering")}
                                    </span>
                                </div>

                                <div className="mt-6">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 font-medium">
                                            <Users className="h-4 w-4 text-primary" />
                                            {t("landing.lobbyDemo.players")}
                                        </span>
                                        <span className="font-semibold">8 / 10</span>
                                    </div>
                                    <div
                                        className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"
                                        role="progressbar"
                                        aria-label={t("landing.lobbyDemo.playersProgress")}
                                        aria-valuemin={0}
                                        aria-valuemax={10}
                                        aria-valuenow={8}
                                    >
                                        <div className="h-full w-4/5 rounded-full bg-primary" />
                                    </div>
                                </div>

                                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-xl border bg-card p-4">
                                        <Swords className="h-5 w-5 text-primary" />
                                        <p className="mt-2 font-medium">
                                            {t("landing.lobbyDemo.teams")}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {t("landing.lobbyDemo.teamsDescription")}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border bg-card p-4">
                                        <CheckCircle2 className="h-5 w-5 text-success" />
                                        <p className="mt-2 font-medium">
                                            {t("landing.lobbyDemo.ready")}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {t("landing.lobbyDemo.readyDescription")}
                                        </p>
                                    </div>
                                </div>

                                <p className="mt-5 border-t pt-4 text-sm text-muted-foreground">
                                    {t("landing.lobbyDemo.nextStep")}
                                </p>
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
                <section className="border-y bg-muted/35">
                    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
                        <p className="font-semibold text-primary">{t("landing.loop.eyebrow")}</p>
                        <h2 className="mt-2 text-3xl font-bold">{t("landing.loop.title")}</h2>
                        <p className="mt-3 max-w-2xl text-muted-foreground">
                            {t("landing.loop.description")}
                        </p>
                        <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                            {productLoop.map(([Icon, key], index) => (
                                <li key={key} className="rounded-xl border bg-card p-4">
                                    <span className="text-xs font-bold text-primary">
                                        {index + 1}
                                    </span>
                                    <Icon
                                        className="mt-3 h-5 w-5 text-primary"
                                        aria-hidden="true"
                                    />
                                    <p className="mt-2 font-medium">{t(key)}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>
                <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
                    <h2 className="text-3xl font-bold">{t("landing.cta.title")}</h2>
                    <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                        {t("landing.cta.description")}
                    </p>
                    <Button className="mt-7" size="lg" asChild>
                        <Link to="/register">
                            {t("landing.cta.button")}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </section>
            </main>
            <footer className="border-t bg-card">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div>
                        <p className="font-bold">FPL_LOL</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t("landing.footer.riotBoilerplate")}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t("landing.footer.description")}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {t("landing.footer.copyright", { year: new Date().getFullYear() })}
                        </p>
                    </div>
                    <a
                        className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary"
                        href="https://github.com/Mariani5472/site_league_tournaments"
                        target="_blank"
                        rel="noreferrer"
                    >
                        <Code2 className="h-4 w-4" /> GitHub
                    </a>
                </div>
            </footer>
        </div>
    );
}
