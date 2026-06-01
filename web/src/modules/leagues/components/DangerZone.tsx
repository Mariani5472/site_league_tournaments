import { Button } from "@/components/ui/button";

type Props = {
  leagueId: string;
};

export function DangerZone({
  leagueId
}: Props) {
  function handleDelete() {
    console.log(
      "delete league",
      leagueId
    );
  }

  return (
    <div
      className="
        rounded-xl
        border
        border-red-500
        p-6
      "
    >
      <h2
        className="
          text-xl
          font-semibold
          text-red-500
        "
      >
        Danger Zone
      </h2>

      <p
        className="
          mt-2
          text-sm
          text-muted-foreground
        "
      >
        This action cannot be
        undone.
      </p>

      <Button
        variant="destructive"
        className="mt-4"
        onClick={
          handleDelete
        }
      >
        Delete League
      </Button>
    </div>
  );
}