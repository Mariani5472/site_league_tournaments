import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState, type ReactNode } from "react";
import { createLobby } from "../services/leagues.service";
import { queryKeys } from "@/lib/queryKeys";
import { t } from "@/i18n";
import { mutationErrorMessage } from "@/services/api-errors";
interface Props {
    leagueId: string;
    children: ReactNode;
}
export function CreateLobbyDialog({ leagueId, children }: Props) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [maxPlayers, setMaxPlayers] = useState(10);
    const mutation = useMutation({
        mutationFn: (data: {
            maxPlayers: number;
        }) => createLobby(leagueId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.leagues.lobbies(leagueId)
            });
            toast.success(t("league.lobbyCreated"));
            setOpen(false);
            setMaxPlayers(10);
        },
        onError: (error: unknown) => {
            toast.error(mutationErrorMessage(error));
        }
    });
    function handleSubmit() {
        mutation.mutate({
            maxPlayers
        });
    }
    return (<Dialog open={open} onOpenChange={setOpen}>

      <DialogTrigger asChild>

        {children}

      </DialogTrigger>

      <DialogContent>

        <DialogHeader>

          <DialogTitle>

            {t("league.createLobby")}

          </DialogTitle>

        </DialogHeader>

        <div className="
            space-y-4
          ">

          <div>

            <label className="
                text-sm
                font-medium
              ">
              {t("league.maxPlayers")}
            </label>

            <Input type="number" min={2} max={10} value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}/>

          </div>

          <Button className="w-full" disabled={mutation.isPending} onClick={handleSubmit}>

            {mutation.isPending
            ? t("league.creating")
            : t("league.createLobby")}

          </Button>

        </div>

      </DialogContent>

    </Dialog>);
}
