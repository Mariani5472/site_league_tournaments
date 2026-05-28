import { useParams } from "react-router-dom";
import { useLeague } from "../hooks/useLeague";
import { useLeagueMembers } from "../hooks/useLeagueMembers";
import { useLeagueRequests } from "../hooks/useLeagueRequests";
import { LeagueHeader } from "../components/LeagueHeader";
import { LeagueMembers } from "../components/LeagueMembers";
import { LeagueRequests } from "../components/LeagueRequests";
import { useLeagueRole } from "../hooks/useLeagueRole";

export function LeaguePage() {
  const { id } = useParams();

  const leagueId = id!;

  const {
    data: league,
    isLoading: loadingLeague
  } = useLeague(leagueId);

  const {
    data: members
  } = useLeagueMembers(leagueId);

  const {
    data: requests
  } = useLeagueRequests(leagueId);

  const roleData = useLeagueRole(members || []);

  if (loadingLeague || !league) {
    return (
      <div>
        Loading league...
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
      />

      <div
        className="
          grid
          gap-6
          xl:grid-cols-2
        "
      >
        <LeagueMembers
          members={members || []}
          role={roleData.role}
          isAdmin={roleData.isAdmin}
        />

        {roleData.isAdmin && (
          <LeagueRequests
            leagueId={leagueId}
            requests={requests || []}
          />
        )}
      </div>
    </div>
  );
}