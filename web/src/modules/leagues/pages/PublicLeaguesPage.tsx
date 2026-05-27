import { Link } from "react-router-dom";

import { usePublicLeagues } from "../hooks/usePublicLeagues";

export function PublicLeaguesPage() {
  const {
    data,
    isLoading
  } = usePublicLeagues();

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
          </Link>
        ))}
      </div>
    </div>
  );
}