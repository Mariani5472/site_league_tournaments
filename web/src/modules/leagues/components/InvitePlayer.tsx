import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/i18n";
import { useDiscoverPlayers } from "@/modules/profile/hooks/useDiscoverPlayers";
import { mutationErrorMessage } from "@/services/api-errors";
import { invitePlayer } from "../services/leagues.service";

export function InvitePlayer({ leagueId }: { leagueId: string }) {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => window.clearTimeout(timeout);
    }, [search]);
    const players = useDiscoverPlayers(debouncedSearch);
    const invitation = useMutation({
        mutationFn: (recipientId: string) => invitePlayer(leagueId, recipientId),
        onSuccess: () => toast.success(t("invitation.sent")),
        onError: error => toast.error(mutationErrorMessage(error)),
    });

    return (
        <section className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 className="font-semibold">{t("invitation.invitePlayer")}</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t("invitation.adminHint")}</p>
            <div className="relative mt-4">
                <Search
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                />
                <label htmlFor="invitation-player-search" className="sr-only">
                    {t("invitation.search")}
                </label>
                <Input
                    id="invitation-player-search"
                    className="pl-9"
                    value={search}
                    placeholder={t("invitation.search")}
                    onChange={event => setSearch(event.target.value)}
                />
            </div>
            {debouncedSearch && (
                <div className="mt-3 space-y-2" aria-live="polite">
                    {players.isLoading ? (
                        <p className="text-sm text-muted-foreground">{t("players.loading")}</p>
                    ) : players.data?.length ? (
                        players.data.slice(0, 5).map(player => (
                            <div
                                key={player.id}
                                className="flex items-center justify-between gap-3 rounded-lg border p-3"
                            >
                                <span className="truncate text-sm font-medium">
                                    {player.nickname}
                                </span>
                                <Button
                                    size="sm"
                                    disabled={invitation.isPending}
                                    onClick={() => invitation.mutate(player.id)}
                                >
                                    {t("invitation.send")}
                                </Button>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground">{t("players.empty")}</p>
                    )}
                </div>
            )}
        </section>
    );
}
