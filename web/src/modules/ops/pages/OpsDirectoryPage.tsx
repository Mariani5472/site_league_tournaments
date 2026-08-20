import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Shield, Trophy, Users } from "lucide-react";
import { EmptyState } from "@/components/async/EmptyState";
import { InlineError } from "@/components/async/InlineError";
import { PageSkeleton } from "@/components/async/PageSkeleton";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, t } from "@/i18n";
import { useOpsLeagues, useOpsUsers } from "../hooks";

export function OpsDirectoryPage() {
    const [params, setParams] = useSearchParams();
    const section = params.get("section") === "leagues" ? "leagues" : "users";
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => window.clearTimeout(timer);
    }, [search]);
    const users = useOpsUsers(section === "users" ? debouncedSearch : "");
    const leagues = useOpsLeagues(section === "leagues" ? debouncedSearch : "");
    const query = section === "users" ? users : leagues;
    const items = query.data ?? [];

    return (
        <div className="space-y-6">
            <header className="rounded-2xl border bg-card p-6 shadow-sm">
                <p className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Shield className="h-4 w-4" /> {t("ops.eyebrow")}
                </p>
                <h1 className="mt-2 text-3xl font-bold">{t("ops.title")}</h1>
                <p className="mt-2 text-muted-foreground">{t("ops.description")}</p>
                <div className="mt-5 flex gap-2" aria-label={t("ops.directoryType")}>
                    <Button
                        variant={section === "users" ? "default" : "outline"}
                        onClick={() => setParams({ section: "users" })}
                    >
                        <Users className="h-4 w-4" /> {t("ops.users")}
                    </Button>
                    <Button
                        variant={section === "leagues" ? "default" : "outline"}
                        onClick={() => setParams({ section: "leagues" })}
                    >
                        <Trophy className="h-4 w-4" /> {t("ops.leagues")}
                    </Button>
                </div>
                <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        aria-label={
                            section === "users" ? t("ops.searchUsers") : t("ops.searchLeagues")
                        }
                        placeholder={
                            section === "users"
                                ? t("ops.userPlaceholder")
                                : t("ops.leaguePlaceholder")
                        }
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                    />
                </div>
            </header>

            {query.isLoading ? (
                <PageSkeleton />
            ) : query.isError ? (
                <InlineError message={t("ops.loadError")} retry={query.refetch} />
            ) : items.length === 0 ? (
                <EmptyState title={t("ops.empty")} />
            ) : (
                <section className="space-y-3" aria-label={t("ops.results")}>
                    {items.map(item =>
                        section === "users" && "nickname" in item ? (
                            <Link
                                key={item.id}
                                to={`/ops/users/${item.id}`}
                                className="block rounded-xl border bg-card p-4 hover:border-primary/50"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <h2 className="font-semibold">{item.nickname}</h2>
                                        <p className="text-sm text-muted-foreground">{item.id}</p>
                                    </div>
                                    <div className="text-right text-sm">
                                        <p>
                                            {t("ops.memberships", { count: item.membershipCount })}
                                        </p>
                                        <p className="text-muted-foreground">
                                            {t("ops.since", { date: formatDate(item.createdAt) })}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ) : "name" in item ? (
                            <Link
                                key={item.id}
                                to={`/ops/leagues/${item.id}`}
                                className="block rounded-xl border bg-card p-4 hover:border-primary/50"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <h2 className="font-semibold">{item.name}</h2>
                                        <p className="text-sm text-muted-foreground">
                                            {t("ops.owner", { nickname: item.ownerNickname })}
                                        </p>
                                    </div>
                                    <div className="text-right text-sm">
                                        <p>{t("ops.memberCount", { count: item.memberCount })}</p>
                                        <p className="text-muted-foreground">
                                            {t("ops.status", { status: item.operationalStatus })}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ) : null
                    )}
                    <LoadMoreButton
                        hasNextPage={query.hasNextPage}
                        isFetchingNextPage={query.isFetchingNextPage}
                        isFetchNextPageError={query.isFetchNextPageError}
                        onLoadMore={() => void query.fetchNextPage()}
                    />
                </section>
            )}
        </div>
    );
}
