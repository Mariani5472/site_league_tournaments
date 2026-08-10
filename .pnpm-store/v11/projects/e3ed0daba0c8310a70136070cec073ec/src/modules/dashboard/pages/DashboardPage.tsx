export function DashboardPage() {
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
          Dashboard
        </h1>

        <p
          className="
            text-muted-foreground
          "
        >
          Welcome to your league hub.
        </p>
      </div>

      <div
        className="
          grid
          gap-4
          md:grid-cols-3
        "
      >
        <div
          className="
            rounded-xl
            border
            p-6
          "
        >
          <h2
            className="
              text-sm
              text-muted-foreground
            "
          >
            My Leagues
          </h2>

          <p
            className="
              mt-2
              text-3xl
              font-bold
            "
          >
            0
          </p>
        </div>

        <div
          className="
            rounded-xl
            border
            p-6
          "
        >
          <h2
            className="
              text-sm
              text-muted-foreground
            "
          >
            Pending Requests
          </h2>

          <p
            className="
              mt-2
              text-3xl
              font-bold
            "
          >
            0
          </p>
        </div>

        <div
          className="
            rounded-xl
            border
            p-6
          "
        >
          <h2
            className="
              text-sm
              text-muted-foreground
            "
          >
            Active Matches
          </h2>

          <p
            className="
              mt-2
              text-3xl
              font-bold
            "
          >
            0
          </p>
        </div>
      </div>
    </div>
  );
}