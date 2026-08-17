import { useEffect, useState } from "react";
import { Search, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { Input } from "@/components/ui/input";
import { t, tp } from "@/i18n";
import { useDiscoverPlayers } from "../hooks/useDiscoverPlayers";

export function PlayersPage() {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => window.clearTimeout(timeout);
    }, [search]);
    const query = useDiscoverPlayers(debouncedSearch);
    const players = query.data ?? [];
    return (
        <div className="space-y-6">
            <header className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" /> {t("sidebar.players")}
                </div>
                <h1 className="mt-2 text-3xl font-bold tracking-tight">{t("players.title")}</h1>
                <p className="mt-2 max-w-2xl text-muted-foreground">{t("players.description")}</p>
                <div className="relative mt-5">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        aria-label={t("players.search")}
                        className="pl-9"
                        placeholder={t("players.search")}
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                    />
                </div>
            </header>
            {query.isLoading ? (
                <p role="status" className="rounded-xl border p-6 text-muted-foreground">
                    {t("players.loading")}
                </p>
            ) : query.isError ? (
                <p
                    role="alert"
                    className="rounded-xl border border-destructive/30 p-6 text-destructive"
                >
                    {t("players.error")}
                </p>
            ) : players.length === 0 ? (
                <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                    {t("players.empty")}
                </p>
            ) : (
                <section className="grid gap-3 sm:grid-cols-2">
                    {players.map(player => (
                        <Link
                            key={player.id}
                            to={`/players/${player.id}`}
                            className="flex gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
                        >
                            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary font-bold text-primary-foreground">
                                {player.avatarUrl ? (
                                    <img
                                        src={player.avatarUrl}
                                        alt=""
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    player.nickname.slice(0, 2).toUpperCase()
                                )}
                            </div>
                            <div className="min-w-0">
                                <h2 className="truncate font-semibold">{player.nickname}</h2>
                                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                                    {player.publicLeagues.length
                                        ? t("players.publicLeagues", {
                                              leagues: player.publicLeagues.join(", "),
                                          })
                                        : t("players.noPublicLeagues")}
                                </p>
                                {player.commonPublicLeagueCount > 0 && (
                                    <p className="mt-1 text-xs font-medium text-primary">
                                        {tp(player.commonPublicLeagueCount, {
                                            one: "players.commonLeague.one",
                                            other: "players.commonLeague.other",
                                        })}
                                    </p>
                                )}
                            </div>
                        </Link>
                    ))}
                    <div className="sm:col-span-2">
                        <LoadMoreButton
                            hasNextPage={query.hasNextPage}
                            isFetchingNextPage={query.isFetchingNextPage}
                            isFetchNextPageError={query.isFetchNextPageError}
                            onLoadMore={() => void query.fetchNextPage()}
                        />
                    </div>
                </section>
            )}
        </div>
    );
}
