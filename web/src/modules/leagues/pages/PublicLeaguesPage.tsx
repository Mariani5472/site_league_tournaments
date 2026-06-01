import { Link } from "react-router-dom";

import { usePublicLeagues } from "../hooks/usePublicLeagues";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export function PublicLeaguesPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = usePublicLeagues(search);

  if (isLoading) {
    return (
      <div>
        Loading...
      </div>
    );
  }

  return (
    <div
      className="
        space-y-6
      "
    >
      <div>
        <h1
          className="
            text-3xl
            font-bold
          "
        >
          Public Leagues
        </h1>

        <p
          className="
            text-muted-foreground
          "
        >
          Find leagues to join.
        </p>

        <Input
          placeholder="Search leagues..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div
        className="
          grid
          gap-4
          md:grid-cols-2
          xl:grid-cols-3
        "
      >
        {data?.map((league) => (
          <Link
            key={league.id}
            to={`/leagues/${league.id}`}
            className="
              rounded-xl
              border
              p-6
            "
          >
            <h2
              className="
                text-xl
                font-semibold
              "
            >
              {league.name}
            </h2>

            <p
              className="
                mt-2
                text-sm
                text-muted-foreground
              "
            >
              {league.description}
            </p>
            
            <p
              className="
                mt-2
                text-sm
                text-muted-foreground
              "
            >
              {league.visibility}
            </p>

            <p
              className="
                mt-2
                text-sm
                text-muted-foreground
              "
            >
              {league.join_policy}
            </p>            
          </Link>
        ))}
      </div>
    </div>
  );
}