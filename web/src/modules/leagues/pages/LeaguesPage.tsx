import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useDiscoverLeagues } from "../hooks/useDiscoverLeagues";
import { useMineLeagues } from "../hooks/useMineLeagues";
import { LeagueListItem } from "../components/LeagueListItem";
import { CreateLeagueDialog } from "../components/CreateLeagueDialog";
import { Search, Trophy } from "lucide-react";
import { t, tp } from "@/i18n";
import { LoadMoreButton } from "@/components/LoadMoreButton";
export function LeaguesPage() {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => window.clearTimeout(timeout);
    }, [search]);
    const {
        data: discoverLeagues = [],
        isLoading: discoverLeaguesLoading,
        isError: discoverLeaguesError,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage,
        isFetchNextPageError,
    } = useDiscoverLeagues(debouncedSearch);
    const {
        data: myLeagues = [],
        isLoading: myLeaguesLoading,
        isError: myLeaguesError,
    } = useMineLeagues();
    const isLoading = discoverLeaguesLoading || myLeaguesLoading;
    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">{t("leagues.title")}</h1>
                </div>

                <div className="rounded-xl border p-6">{t("async.leagues")}</div>
            </div>
        );
    }
    return (
        <div className="space-y-8 sm:space-y-10">
            <header className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
                <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/5" />
                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Trophy className="h-4 w-4" /> {t("leagues.hub")}
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            {t("leagues.title")}
                        </h1>
                        <p className="max-w-2xl text-muted-foreground">
                            {t("leagues.description")}
                        </p>
                    </div>
                    <CreateLeagueDialog />
                </div>
            </header>

            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold">{t("leagues.mine")}</h2>

                        <p className="text-sm text-muted-foreground">
                            {t("leagues.mineDescription")}
                        </p>
                    </div>

                    <span className="text-sm text-muted-foreground">
                        {tp(myLeagues.length, {
                            one: "leagues.count.one",
                            other: "leagues.count.other",
                        })}
                    </span>
                </div>

                {myLeaguesError ? (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">
                        {t("leagues.mineError")}
                    </div>
                ) : myLeagues.length === 0 ? (
                    <div
                        className="
              rounded-xl
              border
              border-dashed
              p-8
              text-center
            "
                    >
                        <p className="text-muted-foreground">{t("leagues.mineEmpty")}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {myLeagues.map(league => (
                            <LeagueListItem key={league.id} league={league} />
                        ))}
                    </div>
                )}
            </section>

            <section className="space-y-4">
                <div className="space-y-3">
                    <div>
                        <h2 className="text-xl font-semibold">{t("leagues.discover")}</h2>

                        <p className="text-sm text-muted-foreground">
                            {t("leagues.discoverDescription")}
                        </p>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            className="bg-card pl-9"
                            placeholder={t("leagues.search")}
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                        />
                    </div>
                </div>

                {discoverLeaguesError ? (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">
                        {t("leagues.discoverError")}
                    </div>
                ) : discoverLeagues.length === 0 ? (
                    <div
                        className="
              rounded-xl
              border
              border-dashed
              p-8
              text-center
            "
                    >
                        <p className="text-muted-foreground">{t("leagues.notFound")}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {discoverLeagues.map(league => (
                            <LeagueListItem key={league.id} league={league} />
                        ))}
                        <LoadMoreButton
                            hasNextPage={hasNextPage}
                            isFetchingNextPage={isFetchingNextPage}
                            isFetchNextPageError={isFetchNextPageError}
                            onLoadMore={() => void fetchNextPage()}
                        />
                    </div>
                )}
            </section>
        </div>
    );
}
