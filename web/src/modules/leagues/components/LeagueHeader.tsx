import type { League } from "../types/league";


type Props = { league: League; };

export function LeagueHeader({league}: Props) {
  return (
    <div
      className="
        rounded-xl
        border
        p-6
      "
    >
      <div
        className="
          flex
          items-start
          justify-between
        "
      >
        <div>
          <h1
            className="
              text-3xl
              font-bold
            "
          >
            {league.name}
          </h1>

          <p
            className="
              mt-2
              text-muted-foreground
            "
          >
            {league.description}
          </p>
        </div>

        <div
          className="
            flex
            gap-2
          "
        >
          <span
            className="
              rounded-md
              border
              px-2
              py-1
              text-xs
            "
          >
            {league.visibility}
          </span>

          <span
            className="
              rounded-md
              border
              px-2
              py-1
              text-xs
            "
          >
            {league.join_policy}
          </span>
        </div>
      </div>
    </div>
  );
}