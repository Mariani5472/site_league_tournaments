import { Link, useParams, useSearchParams } from "react-router-dom";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { t } from "@/i18n";
import { LeagueResults } from "@/modules/matches/LeagueResults";
import { LeagueHeader } from "../components/LeagueHeader";
import { LeagueLobbySection } from "../components/LeagueLobbySelection";
import { LeagueMembers } from "../components/LeagueMembers";
import { LeagueRequests } from "../components/LeagueRequests";
import { useLeague } from "../hooks/useLeague";
import { useLeagueLobbies } from "../hooks/useLeagueLobbies";
import { useLeagueMembers } from "../hooks/useLeagueMembers";
import { useLeagueRequests } from "../hooks/useLeagueRequests";
import { useLeagueRole } from "../hooks/useLeagueRole";
import { useLeagueSocket } from "../hooks/useLeagueSocket";

const tabs = ["overview", "standings", "matches", "lobbies", "members"] as const;
type Tab = (typeof tabs)[number];

export function LeaguePage() {
    const { id = "" } = useParams();
    const [searchParams] = useSearchParams();
    const requestedTab = searchParams.get("tab");
    const tab: Tab = tabs.includes(requestedTab as Tab) ? (requestedTab as Tab) : "overview";
    const league = useLeague(id);
    useLeagueSocket(id);
    const members = useLeagueMembers(id);
    const role = useLeagueRole(members.data ?? []);
    const lobbies = useLeagueLobbies(id);
    const requests = useLeagueRequests(id, role.isAdmin || role.isOwner);
    if (league.isLoading) return <div>{t("async.league")}</div>;
    if (league.isError || !league.data)
        return <ErrorState message={t("league.loadError")} retry={league.refetch} />;

    const tabHref = (nextTab: Tab) => {
        const next = new URLSearchParams(searchParams);
        next.set("tab", nextTab);
        return `?${next.toString()}`;
    };
    const activeLobby = lobbies.data?.find(
        item => item.status !== "finished" && item.status !== "cancelled"
    );
    const nextAction = activeLobby
        ? t("league.nextActionLobby")
        : t("league.nextActionCreateLobby");
    return (
        <div className="space-y-6">
            <LeagueHeader
                league={league.data}
                isAdmin={role.isAdmin}
                isOwner={role.isOwner}
                role={role.role}
            />
            <nav
                aria-label={t("league.navigation")}
                className="overflow-x-auto rounded-xl border bg-card p-1"
            >
                <div className="flex min-w-max gap-1">
                    {tabs.map(item => (
                        <Link
                            key={item}
                            to={tabHref(item)}
                            aria-current={tab === item ? "page" : undefined}
                            className={`rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tab === item ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                        >
                            {t(`league.tab.${item}`)}
                        </Link>
                    ))}
                </div>
            </nav>

            {tab === "overview" && (
                <div className="space-y-6">
                    <section className="grid gap-3 sm:grid-cols-3">
                        <Summary
                            label={t("league.yourPosition")}
                            value={role.role ? t(`enum.role.${role.role}`) : t("league.notMember")}
                        />
                        <Summary
                            label={t("league.membersSummary")}
                            value={`${league.data.playerCount} / ${league.data.maxPlayers}`}
                        />
                        <Summary label={t("league.nextAction")} value={nextAction} />
                    </section>
                    {role.isAdmin &&
                        (requests.isLoading ? (
                            <p>{t("async.requests")}</p>
                        ) : requests.isError ? (
                            <ErrorState
                                message={t("league.requestsError")}
                                retry={requests.refetch}
                            />
                        ) : (
                            <div>
                                <LeagueRequests leagueId={id} requests={requests.data ?? []} />
                                <LoadMoreButton
                                    hasNextPage={requests.hasNextPage}
                                    isFetchingNextPage={requests.isFetchingNextPage}
                                    isFetchNextPageError={requests.isFetchNextPageError}
                                    onLoadMore={() => void requests.fetchNextPage()}
                                />
                            </div>
                        ))}
                </div>
            )}
            {tab === "standings" && <LeagueResults leagueId={id} section="standings" />}
            {tab === "matches" && <LeagueResults leagueId={id} section="matches" />}
            {tab === "lobbies" &&
                (lobbies.isLoading ? (
                    <p>{t("async.lobbies")}</p>
                ) : lobbies.isError ? (
                    <ErrorState message={t("league.lobbiesError")} retry={lobbies.refetch} />
                ) : (
                    <LeagueLobbySection
                        leagueId={id}
                        lobbies={lobbies.data ?? []}
                        isAdmin={role.isAdmin}
                    />
                ))}
            {tab === "members" &&
                (members.isLoading ? (
                    <p>{t("async.members")}</p>
                ) : members.isError ? (
                    <ErrorState message={t("league.membersError")} retry={members.refetch} />
                ) : (
                    <div>
                        <LeagueMembers
                            leagueId={id}
                            members={members.data ?? []}
                            role={role.role}
                            isAdmin={role.isAdmin}
                        />
                        <LoadMoreButton
                            hasNextPage={members.hasNextPage}
                            isFetchingNextPage={members.isFetchingNextPage}
                            isFetchNextPageError={members.isFetchNextPageError}
                            onLoadMore={() => void members.fetchNextPage()}
                        />
                    </div>
                ))}
        </div>
    );
}

function Summary({ label, value }: { label: string; value: string }) {
    return (
        <article className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 font-semibold">{value}</p>
        </article>
    );
}

function ErrorState({ message, retry }: { message: string; retry(): unknown }) {
    return (
        <div className="rounded-xl border p-6">
            <p className="text-destructive" role="alert">
                {message}
            </p>
            <button className="mt-2 underline" onClick={() => retry()}>
                {t("common.retry")}
            </button>
        </div>
    );
}
