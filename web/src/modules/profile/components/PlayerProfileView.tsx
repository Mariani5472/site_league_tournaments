import { useState } from "react";
import { CalendarDays, ImageOff, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDate, formatDateTime, formatNumber, t } from "@/i18n";
import type { PublicProfile } from "../types/profile";

function SafeImage({
    src,
    alt,
    className,
}: {
    src: string | null;
    alt: string;
    className: string;
}) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    if (!src || failedSrc === src) return null;
    return <img src={src} alt={alt} className={className} onError={() => setFailedSrc(src)} />;
}

export function PlayerProfileView({
    profile,
    editAction,
}: {
    profile: PublicProfile;
    editAction?: React.ReactNode;
}) {
    const initials = profile.nickname.slice(0, 2).toUpperCase();
    return (
        <div className="space-y-8">
            <header className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="relative aspect-[3/1] min-h-28 max-h-72 bg-gradient-to-br from-primary/30 via-primary/10 to-muted">
                    <SafeImage
                        src={profile.bannerUrl}
                        alt={t("profile.bannerAlt")}
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                    <ImageOff className="absolute bottom-4 right-4 h-5 w-5 text-muted-foreground/40" />
                </div>
                <div className="relative px-5 pb-6 sm:px-8">
                    <div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex min-w-0 items-end gap-4">
                            <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-card bg-primary text-xl font-bold text-primary-foreground sm:h-24 sm:w-24">
                                <span>{initials}</span>
                                <SafeImage
                                    src={profile.avatarUrl}
                                    alt={t("profile.avatarAlt")}
                                    className="absolute inset-0 h-full w-full object-cover"
                                />
                            </div>
                            <div className="min-w-0 pb-1">
                                <h1 className="truncate text-2xl font-bold sm:text-3xl">
                                    {profile.nickname}
                                </h1>
                                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                                    <CalendarDays className="h-4 w-4" />
                                    {t("profile.joinedAt", { date: formatDate(profile.createdAt) })}
                                </p>
                            </div>
                        </div>
                        {editAction}
                    </div>
                </div>
            </header>
            <section>
                <h2 className="mb-4 text-xl font-semibold">{t("profile.platformStats")}</h2>
                <div className="grid gap-3 sm:grid-cols-3">
                    {[
                        ["matches", profile.stats.matchesPlayed, t("profile.matchesPlayed")],
                        ["wins", profile.stats.wins, t("match.wins")],
                        ["losses", profile.stats.losses, t("match.losses")],
                    ].map(([key, value, label]) => (
                        <article key={String(key)} className="rounded-xl border bg-card p-5">
                            <p className="text-sm text-muted-foreground">{label}</p>
                            <p className="mt-2 text-3xl font-bold">{formatNumber(Number(value))}</p>
                        </article>
                    ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{t("profile.statsScope")}</p>
            </section>
            <section>
                <h2 className="mb-4 text-xl font-semibold">{t("profile.publicLeagues")}</h2>
                {profile.publicLeagues.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                        {profile.publicLeagues.map(league => (
                            <Link
                                key={league.id}
                                to={`/leagues/${league.id}`}
                                className="rounded-xl border bg-card p-4 hover:border-primary/40"
                            >
                                <div className="flex justify-between gap-3">
                                    <strong>{league.name}</strong>
                                    <span className="text-sm text-muted-foreground">
                                        {formatNumber(league.playerCount)}/
                                        {formatNumber(league.maxPlayers)}
                                    </span>
                                </div>
                                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                    {league.description || t("dashboard.noDescription")}
                                </p>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p className="rounded-xl border border-dashed p-6 text-muted-foreground">
                        {t("profile.noPublicLeagues")}
                    </p>
                )}
            </section>
            <section>
                <h2 className="mb-4 text-xl font-semibold">{t("profile.recentMatches")}</h2>
                {profile.recentMatches.length ? (
                    <div className="space-y-3">
                        {profile.recentMatches.map(match => (
                            <article
                                key={match.id}
                                className="flex items-center gap-4 rounded-xl border bg-card p-4"
                            >
                                <Trophy className="h-5 w-5 text-primary" />
                                <div className="flex-1">
                                    <p className="font-medium">{match.leagueName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDateTime(match.finishedAt)}
                                    </p>
                                </div>
                                <span
                                    className={
                                        match.result === "win"
                                            ? "font-medium text-emerald-700"
                                            : "font-medium text-destructive"
                                    }
                                >
                                    {match.result === "win"
                                        ? t("dashboard.result.win")
                                        : t("dashboard.result.loss")}
                                </span>
                            </article>
                        ))}
                    </div>
                ) : (
                    <p className="rounded-xl border border-dashed p-6 text-muted-foreground">
                        {t("profile.noMatches")}
                    </p>
                )}
            </section>
        </div>
    );
}
