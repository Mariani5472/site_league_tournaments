import { useState } from "react";
import { Input } from "@/components/ui/input";

import { useDiscoverLeagues } from "../hooks/useDiscoverLeagues";
import { useMineLeagues } from "../hooks/useMineLeagues";
import { LeagueListItem } from "../components/LeagueListItem";

export function LeaguesPage() {
  const [search, setSearch] = useState("");

  const {
    data: discoverLeagues = [],
    isLoading: discoverLeaguesLoading,
  } = useDiscoverLeagues(search);

  const {
    data: myLeagues = [],
    isLoading: myLeaguesLoading,
  } = useMineLeagues();

  const isLoading = discoverLeaguesLoading || myLeaguesLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            Leagues
          </h1>
        </div>

        <div className="rounded-xl border p-6">
          Loading leagues...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">
          Leagues
        </h1>

        <p className="text-muted-foreground">
          Manage your leagues or discover new
          communities to join.
        </p>
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

        {myLeagues.length === 0 ? (
          <div
            className="
              rounded-xl
              border
              border-dashed
              p-8
              text-center
            "
          >
            <p className="text-muted-foreground">
              You are not part of any league yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {myLeagues.map((league) => (
              <LeagueListItem
                key={league.id}
                league={league}
              />
            ))}
          </div>
        )}
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

          <Input
            placeholder="Search leagues..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        {discoverLeagues.length === 0 ? (
          <div
            className="
              rounded-xl
              border
              border-dashed
              p-8
              text-center
            "
          >
            <p className="text-muted-foreground">
              No leagues found.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {discoverLeagues.map((league) => (
              <LeagueListItem
                key={league.id}
                league={league}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}