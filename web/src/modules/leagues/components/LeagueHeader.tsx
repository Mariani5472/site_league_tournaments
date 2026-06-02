import { Button } from "@/components/ui/button";
import type { League } from "../types/league";
import { LeagueJoinActions } from "./LeagueJoinActions";
import { useMutation } from "@tanstack/react-query";
import { deleteLeague, leaveLeague } from "../services/leagues.service";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";


type Props = { 
  league: League;
  isAdmin: boolean;
  isOwner: boolean;
};

export function LeagueHeader({league, isAdmin, isOwner}: Props) {
  const navigate = useNavigate();

  const leaveMutation = useMutation({
    mutationFn: () => leaveLeague(league.id),
    onSuccess: () => {
      toast.success("You left the league");
      navigate("/leagues/my");
    }
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteLeague(league.id),
    onSuccess: () => {
      toast.success("You delete the league");
      navigate("/leagues/my");
    }
  })

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
          
          {league.require_riot_account && (
            <span
              className="
                rounded-md
                border
                px-2
                py-1
                text-xs
              "
            >
              Riot Required
            </span>
          )}
          
        </div>

        {isAdmin && (
          <Link
            to={`/leagues/${league.id}/settings`}
          >
            <Button>
              Settings
            </Button>
          </Link>
        )}

        {isOwner && (
          <Button 
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
          >
            Delete League
          </Button>
        )}

        <LeagueJoinActions
          league={league}
        />
        {!isOwner && (
          <Button
            variant={"outline"}
            onClick={() => leaveMutation.mutate()}
          >
            Leave League
          </Button>
        )}
      </div>
    </div>
  );
}