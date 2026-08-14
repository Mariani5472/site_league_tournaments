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
export function LeaguePage() {
    const { id } = useParams();
    const leagueId = id!;
    const { data: league, isLoading: loadingLeague, isError: leagueError, refetch: retryLeague, } = useLeague(leagueId);
    useLeagueSocket(leagueId);
    const { data: members, isLoading: loadingMembers, isError: membersError, refetch: retryMembers, } = useLeagueMembers(leagueId);
    const roleData = useLeagueRole(members || []);
    const { data: lobbies, isLoading: loadingLobbies, isError: lobbiesError, refetch: retryLobbies, } = useLeagueLobbies(leagueId);
    const { data: requests, isLoading: loadingRequests, isError: requestsError, refetch: retryRequests, } = useLeagueRequests(leagueId, (roleData.isAdmin || roleData.isOwner));
    if (loadingLeague) {
        return (<div>
        Carregando liga...
      </div>);
    }
    if (leagueError || !league) {
        return <div className="rounded-xl border p-6 space-y-3"><p className="text-destructive" role="alert">Não foi possível carregar a liga.</p><button className="underline" onClick={() => retryLeague()}>Tentar novamente</button></div>;
    }
    return (<div className="
        space-y-6
      ">
      <LeagueHeader league={league} isAdmin={roleData.isAdmin} isOwner={roleData.isOwner} role={roleData.role}/>

      <div className="
          grid
          gap-6
          xl:grid-cols-2
        ">
        {loadingLobbies ? <p className="text-muted-foreground">Carregando lobbies...</p> : lobbiesError ? <div className="rounded-xl border p-6"><p className="text-destructive" role="alert">Não foi possível carregar os lobbies.</p><button className="mt-2 underline" onClick={() => retryLobbies()}>Tentar novamente</button></div> : <LeagueLobbySection leagueId={leagueId} lobbies={lobbies ?? []} isAdmin={roleData.isAdmin}/>}

        {loadingMembers ? <p className="text-muted-foreground">Carregando membros...</p> : membersError ? <div className="rounded-xl border p-6"><p className="text-destructive" role="alert">Não foi possível carregar os membros.</p><button className="mt-2 underline" onClick={() => retryMembers()}>Tentar novamente</button></div> : <LeagueMembers leagueId={leagueId} members={members || []} role={roleData.role} isAdmin={roleData.isAdmin}/>}

        {roleData.isAdmin && (loadingRequests ? <p className="text-muted-foreground">Carregando solicitações...</p> : requestsError ? <div className="rounded-xl border p-6"><p className="text-destructive" role="alert">Não foi possível carregar as solicitações.</p><button className="mt-2 underline" onClick={() => retryRequests()}>Tentar novamente</button></div> : (<LeagueRequests leagueId={leagueId} requests={requests || []}/>))}
      </div>
      <LeagueResults leagueId={leagueId}/>
    </div>);
}
