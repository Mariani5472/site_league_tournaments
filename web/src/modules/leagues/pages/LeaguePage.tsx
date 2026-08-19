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
import { useLeagueSocket } from "../hooks/useLeagueSocket";
import { PageSkeleton } from "@/components/async/PageSkeleton";
import { InlineError } from "@/components/async/InlineError";
import { InvitePlayer } from "../components/InvitePlayer";

const tabs = ["overview", "standings", "matches", "lobbies", "members"] as const;
type Tab = (typeof tabs)[number];

export function LeaguePage() {
    const { id = "" } = useParams();
    const [searchParams] = useSearchParams();
    const requestedTab = searchParams.get("tab");
    const tab: Tab = tabs.includes(requestedTab as Tab) ? (requestedTab as Tab) : "overview";
    const league = useLeague(id);
    const currentRole = league.data?.currentUserRole ?? null;
    const isMember = Boolean(currentRole);
    const isOwner = currentRole === "owner";
    const isAdmin = currentRole === "owner" || currentRole === "admin";
    const canCreateLobby = isMember && (isAdmin || league.data?.lobbyCreationPolicy === "members");
    useLeagueSocket(id, isMember);
    const members = useLeagueMembers(id, isMember);
    const lobbies = useLeagueLobbies(id, isMember);
    const requests = useLeagueRequests(id, isAdmin);
    if (league.isLoading) return <PageSkeleton rows={4} label={t("async.league")} />;
    if (league.isError || !league.data)
        return <ErrorState message={t("league.loadError")} retry={league.refetch} />;

    if (!isMember) {
        return (
            <div className="space-y-6">
                <LeagueHeader league={league.data} isAdmin={false} isOwner={false} role={null} />
                <section className="rounded-xl border border-dashed bg-card p-8 text-center">
                    <h2 className="text-xl font-semibold">{t("league.memberOnlyTitle")}</h2>
                    <p className="mt-2 text-muted-foreground">
                        {t("league.memberOnlyDescription")}
                    </p>
                </section>
            </div>
        );
    }

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
                isAdmin={isAdmin}
                isOwner={isOwner}
                role={currentRole}
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
                            value={
                                currentRole ? t(`enum.role.${currentRole}`) : t("league.notMember")
                            }
                        />
                        <Summary
                            label={t("league.membersSummary")}
                            value={`${league.data.playerCount} / ${league.data.maxPlayers}`}
                        />
                        <Summary label={t("league.nextAction")} value={nextAction} />
                    </section>
                    {isAdmin && league.data.joinPolicy === "invite_only" && (
                        <InvitePlayer leagueId={id} />
                    )}
                    {isAdmin &&
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
                        canCreateLobby={canCreateLobby}
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
                            role={currentRole}
                            isAdmin={isAdmin}
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
    return <InlineError message={message} retry={retry} />;
}
