import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { deleteLeague } from "../services/leagues.service";
import { mutationErrorMessage } from "@/services/api-errors";
type Props = {
    leagueId: string;
    leagueName: string;
};
export function DangerZone({ leagueId, leagueName }: Props) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [confirmation, setConfirmation] = useState("");
    const deleteMutation = useMutation({
        mutationFn: () => deleteLeague(leagueId),
        onSuccess: () => {
            toast.success("League deleted.");
            setOpen(false);
            navigate("/leagues");
        },
        onError: (error: unknown) => toast.error(mutationErrorMessage(error)),
    });
    const confirmed = confirmation === leagueName;
    function changeOpen(nextOpen: boolean) {
        if (deleteMutation.isPending) return;
        setOpen(nextOpen);
        if (!nextOpen) setConfirmation("");
    }
    return (<div className="
        rounded-xl
        border
        border-red-500
        p-6
      ">
      <h2 className="
          text-xl
          font-semibold
          text-red-500
        ">
        Danger Zone
      </h2>

      <p className="
          mt-2
          text-sm
          text-muted-foreground
        ">
        Deleting this league permanently removes access to its memberships, requests,
        lobbies and match history. This action cannot be undone.
      </p>

      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" className="mt-4">Delete League</Button>
        </DialogTrigger>
        <DialogContent showCloseButton={!deleteMutation.isPending}>
          <DialogHeader>
            <DialogTitle>Delete {leagueName}?</DialogTitle>
            <DialogDescription>
              This permanently deletes the league and its associated competition data.
              Type <strong>{leagueName}</strong> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            aria-label="League name confirmation"
            autoComplete="off"
            disabled={deleteMutation.isPending}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" disabled={deleteMutation.isPending} onClick={() => changeOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!confirmed || deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? "Deleting..." : "Permanently delete league"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);
}
