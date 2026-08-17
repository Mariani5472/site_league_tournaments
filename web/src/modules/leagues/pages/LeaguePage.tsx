import { useParams } from "react-router-dom";
import { useLeague } from "../hooks/useLeague";
import { useLeagueMembers } from "../hooks/useLeagueMembers";
import { useLeagueRequests } from "../hooks/useLeagueRequests";
import { LeagueHeader } from "../components/LeagueHeader";
import { LeagueMembers } from "../components/LeagueMembers";
import { LeagueRequests } from "../components/LeagueRequests";
import { useLeagueRole } from "../hooks/useLeagueRole";
import { useLeagueLobbies } from "../hooks/useLeagueLobbies";
import { LeagueLobbySection } from "../components/LeagueLobbySelection";
import { useLeagueSocket } from "../hooks/useLeagueSocket";
import { LeagueResults } from "@/modules/matches/LeagueResults";
import { t } from "@/i18n";
import { LoadMoreButton } from "@/components/LoadMoreButton";
export function LeaguePage() {
    const { id } = useParams();
    const leagueId = id!;
    const {
        data: league,
        isLoading: loadingLeague,
        isError: leagueError,
        refetch: retryLeague,
    } = useLeague(leagueId);
    useLeagueSocket(leagueId);
    const {
        data: members,
        isLoading: loadingMembers,
        isError: membersError,
        refetch: retryMembers,
        hasNextPage: hasMoreMembers,
        fetchNextPage: fetchMoreMembers,
        isFetchingNextPage: loadingMoreMembers,
        isFetchNextPageError: moreMembersError,
    } = useLeagueMembers(leagueId);
    const roleData = useLeagueRole(members || []);
    const {
        data: lobbies,
        isLoading: loadingLobbies,
        isError: lobbiesError,
        refetch: retryLobbies,
    } = useLeagueLobbies(leagueId);
    const {
        data: requests,
        isLoading: loadingRequests,
        isError: requestsError,
        refetch: retryRequests,
        hasNextPage: hasMoreRequests,
        fetchNextPage: fetchMoreRequests,
        isFetchingNextPage: loadingMoreRequests,
        isFetchNextPageError: moreRequestsError,
    } = useLeagueRequests(leagueId, roleData.isAdmin || roleData.isOwner);
    if (loadingLeague) {
        return <div>{t("async.league")}</div>;
    }
    if (leagueError || !league) {
        return (
            <div className="rounded-xl border p-6 space-y-3">
                <p className="text-destructive" role="alert">
                    {t("league.loadError")}
                </p>
                <button className="underline" onClick={() => retryLeague()}>
                    {t("common.retry")}
                </button>
            </div>
        );
    }
    return (
        <div
            className="
        space-y-6
      "
        >
            <LeagueHeader
                league={league}
                isAdmin={roleData.isAdmin}
                isOwner={roleData.isOwner}
                role={roleData.role}
            />

            <div
                className="
          grid
          gap-6
          xl:grid-cols-2
        "
            >
                {loadingLobbies ? (
                    <p className="text-muted-foreground">{t("async.lobbies")}</p>
                ) : lobbiesError ? (
                    <div className="rounded-xl border p-6">
                        <p className="text-destructive" role="alert">
                            {t("league.lobbiesError")}
                        </p>
                        <button className="mt-2 underline" onClick={() => retryLobbies()}>
                            {t("common.retry")}
                        </button>
                    </div>
                ) : (
                    <LeagueLobbySection
                        leagueId={leagueId}
                        lobbies={lobbies ?? []}
                        isAdmin={roleData.isAdmin}
                    />
                )}

                {loadingMembers ? (
                    <p className="text-muted-foreground">{t("async.members")}</p>
                ) : membersError ? (
                    <div className="rounded-xl border p-6">
                        <p className="text-destructive" role="alert">
                            {t("league.membersError")}
                        </p>
                        <button className="mt-2 underline" onClick={() => retryMembers()}>
                            {t("common.retry")}
                        </button>
                    </div>
                ) : (
                    <div>
                        <LeagueMembers
                            leagueId={leagueId}
                            members={members || []}
                            role={roleData.role}
                            isAdmin={roleData.isAdmin}
                        />
                        <LoadMoreButton
                            hasNextPage={hasMoreMembers}
                            isFetchingNextPage={loadingMoreMembers}
                            isFetchNextPageError={moreMembersError}
                            onLoadMore={() => void fetchMoreMembers()}
                        />
                    </div>
                )}

                {roleData.isAdmin &&
                    (loadingRequests ? (
                        <p className="text-muted-foreground">{t("async.requests")}</p>
                    ) : requestsError ? (
                        <div className="rounded-xl border p-6">
                            <p className="text-destructive" role="alert">
                                {t("league.requestsError")}
                            </p>
                            <button className="mt-2 underline" onClick={() => retryRequests()}>
                                {t("common.retry")}
                            </button>
                        </div>
                    ) : (
                        <div>
                            <LeagueRequests leagueId={leagueId} requests={requests || []} />
                            <LoadMoreButton
                                hasNextPage={hasMoreRequests}
                                isFetchingNextPage={loadingMoreRequests}
                                isFetchNextPageError={moreRequestsError}
                                onLoadMore={() => void fetchMoreRequests()}
                            />
                        </div>
                    ))}
            </div>
            <LeagueResults leagueId={leagueId} />
        </div>
    );
}
