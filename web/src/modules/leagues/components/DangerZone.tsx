import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { deleteLeague } from "../services/leagues.service";
import { mutationErrorMessage } from "@/services/api-errors";
import { t } from "@/i18n";
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
            toast.success(t("danger.deleted"));
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
        {t("danger.title")}
      </h2>

      <p className="
          mt-2
          text-sm
          text-muted-foreground
        ">
        {t("danger.impact")}
      </p>

      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" className="mt-4">{t("danger.delete")}</Button>
        </DialogTrigger>
        <DialogContent showCloseButton={!deleteMutation.isPending}>
          <DialogHeader>
            <DialogTitle>{t("danger.confirmTitle", { name: leagueName })}</DialogTitle>
            <DialogDescription>
              {t("danger.confirmDescription", { name: leagueName })}
            </DialogDescription>
          </DialogHeader>
          <Input
            aria-label={t("danger.confirmLabel")}
            autoComplete="off"
            disabled={deleteMutation.isPending}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" disabled={deleteMutation.isPending} onClick={() => changeOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={!confirmed || deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? t("danger.deleting") : t("danger.permanent")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);
}
