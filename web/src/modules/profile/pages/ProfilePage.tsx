import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/i18n";
import { queryKeys } from "@/lib/queryKeys";
import { useMyRiotAccount } from "@/modules/riot/hooks/useMyRiotAccount";
import { useRiotConfiguration } from "@/modules/riot/hooks/useRiotConfiguration";
import { linkRiotAccount, unlinkAccount } from "@/modules/riot/services/riot.service";
import { mutationErrorMessage } from "@/services/api-errors";
import { PlayerProfileView } from "../components/PlayerProfileView";
import { RiotAccountCard } from "../components/riotAccount";
import { useMyProfile } from "../hooks/useMyProfile";
import { updateProfile } from "../services/profile.service";

export function ProfilePage() {
    const client = useQueryClient();
    const profileQuery = useMyProfile();
    const riotQuery = useMyRiotAccount();
    const riotConfiguration = useRiotConfiguration();
    const [editing, setEditing] = useState(false);
    const [nickname, setNickname] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [bannerUrl, setBannerUrl] = useState("");
    const [gameName, setGameName] = useState("");
    const [tagLine, setTagLine] = useState("");
    const update = useMutation({
        mutationFn: updateProfile,
        onSuccess: async () => {
            await client.invalidateQueries({ queryKey: queryKeys.profile.me });
            setEditing(false);
            toast.success(t("profile.updated"));
        },
        onError: error => toast.error(mutationErrorMessage(error)),
    });
    const link = useMutation({
        mutationFn: linkRiotAccount,
        onSuccess: () => {
            client.invalidateQueries({ queryKey: queryKeys.riot.me });
            setGameName("");
            setTagLine("");
            toast.success(t("profile.linked"));
        },
        onError: error => toast.error(mutationErrorMessage(error)),
    });
    const unlink = useMutation({
        mutationFn: unlinkAccount,
        onSuccess: () => {
            client.invalidateQueries({ queryKey: queryKeys.riot.me });
            toast.success(t("profile.unlinked"));
        },
        onError: error => toast.error(mutationErrorMessage(error)),
    });
    if (profileQuery.isLoading || riotQuery.isLoading || riotConfiguration.isLoading)
        return <p>{t("async.profile")}</p>;
    if (profileQuery.isError || !profileQuery.data)
        return (
            <div className="rounded-xl border p-6">
                <p role="alert" className="text-destructive">
                    {t("profile.loadError")}
                </p>
                <Button className="mt-3" variant="outline" onClick={() => profileQuery.refetch()}>
                    {t("common.retry")}
                </Button>
            </div>
        );
    const profile = profileQuery.data;
    function toggleEditing() {
        if (!editing) {
            setNickname(profile.nickname);
            setAvatarUrl(profile.avatarUrl ?? "");
            setBannerUrl(profile.bannerUrl ?? "");
        }
        setEditing(value => !value);
    }
    return (
        <div className="space-y-6">
            <PlayerProfileView
                profile={profile}
                editAction={
                    <Button variant={editing ? "outline" : "default"} onClick={toggleEditing}>
                        {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                        {editing ? t("common.cancel") : t("profile.edit")}
                    </Button>
                }
            />
            {editing && (
                <section className="rounded-2xl border bg-card p-5 sm:p-6">
                    <h2 className="text-xl font-semibold">{t("profile.editTitle")}</h2>
                    <div className="mt-5 space-y-4">
                        <div>
                            <label htmlFor="nickname" className="text-sm font-medium">
                                {t("profile.nickname")}
                            </label>
                            <Input
                                id="nickname"
                                className="mt-2"
                                value={nickname}
                                onChange={event => setNickname(event.target.value)}
                            />
                        </div>
                        <ImageUrlField
                            id="avatar-url"
                            label={t("profile.avatarUrl")}
                            value={avatarUrl}
                            onChange={setAvatarUrl}
                        />
                        <ImageUrlField
                            id="banner-url"
                            label={t("profile.bannerUrl")}
                            value={bannerUrl}
                            onChange={setBannerUrl}
                        />
                        <Button
                            disabled={update.isPending || nickname.trim().length < 2}
                            onClick={() =>
                                update.mutate({
                                    nickname: nickname.trim(),
                                    avatarUrl: avatarUrl.trim() || null,
                                    bannerUrl: bannerUrl.trim() || null,
                                })
                            }
                        >
                            {update.isPending ? t("common.saving") : t("common.save")}
                        </Button>
                    </div>
                </section>
            )}
            <section className="rounded-2xl border bg-card p-5 sm:p-6">
                <h2 className="text-xl font-semibold">{t("profile.riot")}</h2>
                {riotQuery.data ? (
                    <div className="mt-4 space-y-4">
                        <RiotAccountCard riotAccount={riotQuery.data} />
                        <Button
                            variant="outline"
                            disabled={unlink.isPending}
                            onClick={() => unlink.mutate()}
                        >
                            {unlink.isPending ? t("profile.unlinking") : t("profile.unlink")}
                        </Button>
                    </div>
                ) : riotConfiguration.data?.enabled ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                        <Input
                            aria-label={t("profile.gameName")}
                            placeholder={t("profile.gameName")}
                            value={gameName}
                            onChange={event => setGameName(event.target.value)}
                        />
                        <Input
                            aria-label={t("profile.tagLine")}
                            placeholder={t("profile.tagLine")}
                            value={tagLine}
                            onChange={event => setTagLine(event.target.value)}
                        />
                        <Button
                            disabled={link.isPending}
                            onClick={() => {
                                if (!gameName.trim() || !tagLine.trim())
                                    return toast.error(t("profile.riotFieldsRequired"));
                                link.mutate({ gameName, tagLine });
                            }}
                        >
                            {link.isPending ? t("profile.linking") : t("profile.link")}
                        </Button>
                    </div>
                ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                        {t("profile.riotDisabled")}
                    </p>
                )}
            </section>
        </div>
    );
}

function ImageUrlField({
    id,
    label,
    value,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    onChange(value: string): void;
}) {
    return (
        <div>
            <label htmlFor={id} className="text-sm font-medium">
                {label}
            </label>
            <div className="mt-2 flex gap-2">
                <Input
                    id={id}
                    type="url"
                    value={value}
                    onChange={event => onChange(event.target.value)}
                />
                {value && (
                    <Button
                        type="button"
                        variant="outline"
                        aria-label={t("profile.removeImage", { image: label })}
                        onClick={() => onChange("")}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
