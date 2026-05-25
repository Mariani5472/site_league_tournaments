import { Link } from "react-router-dom";
import { useMyLeagues } from "../hooks/useMyLeagues";

export function MyLeaguesPage() {
  const {
    data,
    isLoading,
    error
  } = useMyLeagues();

  if (isLoading) {
    return (
      <div>
        Loading leagues...
      </div>
    );
  }

  if (error) {
    return (
      <div>
        Failed to load leagues.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className="
          flex
          items-center
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
            My Leagues
          </h1>

          <p
            className="
              text-muted-foreground
            "
          >
            Manage your leagues.
          </p>
        </div>

        <button
          className="
            rounded-md
            bg-primary
            px-4
            py-2
            text-primary-foreground
          "
        >
          Create League
        </button>
      </div>

      {data?.length === 0 && (
        <div
          className="
            rounded-xl
            border
            p-12
            text-center
          "
        >
          <h2
            className="
              text-xl
              font-semibold
            "
          >
            No leagues found
          </h2>

          <p
            className="
              mt-2
              text-muted-foreground
            "
          >
            Create your first league.
          </p>
        </div>
      )}

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
              transition-colors
              hover:bg-muted/50
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
                  {league.description ||
                    "No description"}
                </p>
              </div>
            </div>

            <div
              className="
                mt-6
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
          </Link>
        ))}
      </div>
    </div>
  )  
}