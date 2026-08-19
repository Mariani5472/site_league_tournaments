import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createLeague } from "../services/leagues.service";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import { t } from "@/i18n";
import { labelJoinPolicy, labelVisibility } from "@/i18n/labels";
import { mutationErrorMessage } from "@/services/api-errors";
export function CreateLeagueDialog({
    children,
}: {
    children?: ReactNode;
} = {}) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [visibility, setVisibility] = useState<"public" | "private">("public");
    const [joinPolicy, setJoinPolicy] = useState<"open" | "request" | "invite_only">("request");
    const [maxPlayers, setMaxPlayers] = useState(10);
    const mutation = useMutation({
        mutationFn: createLeague,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.leagues.mine });
            queryClient.invalidateQueries({ queryKey: queryKeys.leagues.discoverAll });
            toast.success(t("league.created"));
            setOpen(false);
            setName("");
            setDescription("");
            setVisibility("public");
            setJoinPolicy("request");
            setMaxPlayers(10);
        },
        onError: error => toast.error(mutationErrorMessage(error)),
    });
    async function handleSubmit() {
        mutation.mutate({
            name: name.trim(),
            description: description.trim(),
            visibility,
            joinPolicy: joinPolicy,
            maxPlayers: maxPlayers,
        });
    }
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children ?? <Button variant="secondary">{t("league.create")}</Button>}
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("league.create")}</DialogTitle>
                </DialogHeader>

                <div
                    className="
            space-y-4
          "
                >
                    <Input
                        placeholder={t("league.name")}
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />

                    <Textarea
                        placeholder={t("league.descriptionLabel")}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                    />

                    <Select
                        value={visibility}
                        onValueChange={value => setVisibility(value as "public" | "private")}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t("league.visibility")} />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="public">{labelVisibility("public")}</SelectItem>

                            <SelectItem value="private">{labelVisibility("private")}</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={joinPolicy}
                        onValueChange={value =>
                            setJoinPolicy(value as "open" | "request" | "invite_only")
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t("league.joinPolicy")} />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="open">{labelJoinPolicy("open")}</SelectItem>

                            <SelectItem value="request">{labelJoinPolicy("request")}</SelectItem>

                            <SelectItem value="invite_only">
                                {labelJoinPolicy("invite_only")}
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    <Input
                        type="number"
                        min={2}
                        max={100}
                        value={maxPlayers}
                        onChange={e => setMaxPlayers(Number(e.target.value))}
                    />

                    <Button className="w-full" onClick={handleSubmit} disabled={mutation.isPending}>
                        {mutation.isPending ? t("league.creating") : t("league.create")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
