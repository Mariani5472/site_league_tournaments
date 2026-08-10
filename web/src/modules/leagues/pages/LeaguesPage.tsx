import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useDiscoverLeagues } from "../hooks/useDiscoverLeagues";
import { useMineLeagues } from "../hooks/useMineLeagues";
import { LeagueListItem } from "../components/LeagueListItem";
import { CreateLeagueDialog } from "../components/CreateLeagueDialog";
import { Search, Trophy } from "lucide-react";
export function LeaguesPage() {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => window.clearTimeout(timeout);
    }, [search]);
    const { data: discoverLeagues = [], isLoading: discoverLeaguesLoading, isError: discoverLeaguesError, } = useDiscoverLeagues(debouncedSearch);
    const { data: myLeagues = [], isLoading: myLeaguesLoading, isError: myLeaguesError, } = useMineLeagues();
    const isLoading = discoverLeaguesLoading || myLeaguesLoading;
    if (isLoading) {
        return (<div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            Leagues
          </h1>
        </div>

        <div className="rounded-xl border p-6">
          Loading leagues...
        </div>
      </div>);
    }
    return (<div className="space-y-8 sm:space-y-10">
      <header className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/5"/>
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Trophy className="h-4 w-4"/> Competition hub</div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Leagues</h1>
            <p className="max-w-2xl text-muted-foreground">Manage your leagues or discover new communities to join.</p>
          </div>
          <CreateLeagueDialog />
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              My Leagues
            </h2>

            <p className="text-sm text-muted-foreground">
              Leagues you are currently part of.
            </p>
          </div>

          <span className="text-sm text-muted-foreground">
            {myLeagues.length} leagues
          </span>
        </div>

        {myLeaguesError ? <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">Could not load your leagues.</div> : myLeagues.length === 0 ? (<div className="
              rounded-xl
              border
              border-dashed
              p-8
              text-center
            ">
            <p className="text-muted-foreground">
              You are not part of any league yet.
            </p>
          </div>) : (<div className="space-y-3">
            {myLeagues.map((league) => (<LeagueListItem key={league.id} league={league}/>))}
          </div>)}
      </section>

      <section className="space-y-4">
        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold">
              Discover Leagues
            </h2>

            <p className="text-sm text-muted-foreground">
              Find public leagues and communities
              to join.
            </p>
          </div>

          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="bg-card pl-9" placeholder="Search leagues..." value={search} onChange={(event) => setSearch(event.target.value)}/></div>
        </div>

        {discoverLeaguesError ? <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">Could not load public leagues.</div> : discoverLeagues.length === 0 ? (<div className="
              rounded-xl
              border
              border-dashed
              p-8
              text-center
            ">
            <p className="text-muted-foreground">
              No leagues found.
            </p>
          </div>) : (<div className="space-y-3">
            {discoverLeagues.map((league) => (<LeagueListItem key={league.id} league={league}/>))}
          </div>)}
      </section>
    </div>);
}
