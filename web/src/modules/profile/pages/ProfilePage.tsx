import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMyProfile } from "../hooks/useMyProfile";
import { updateProfile } from "../services/profile.service";
import { toast } from "sonner";
import { useMyRiotAccount } from "@/modules/riot/hooks/useMyRiotAccount";
import { RiotAccountCard } from "../components/riotAccount";
import { linkRiotAccount, unlinkAccount } from "@/modules/riot/services/riot.service";
import { queryKeys } from "@/lib/queryKeys";
import { useRiotConfiguration } from "@/modules/riot/hooks/useRiotConfiguration";
import { t } from "@/i18n";
import { mutationErrorMessage } from "@/services/api-errors";
export function ProfilePage() {
    const queryClient = useQueryClient();
    const profileQuery = useMyProfile();
    const riotQuery = useMyRiotAccount();
    const riotConfiguration = useRiotConfiguration();
    const { data: profile, isLoading: accountLoading } = profileQuery;
    const { data: riotAccount, isLoading: riotLoading } = riotQuery;
    const [nickname, setNickname] = useState(profile?.nickname || "");
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || "");
    const [bannerUrl, setBannerUrl] = useState(profile?.bannerUrl || "");
    const [gameName, setGameName] = useState("");
    const [tagLine, setTagLine] = useState("");
    const profileUpdateMutation = useMutation({
        mutationFn: updateProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.profile.me
            });
            toast.success(t("profile.updated"));
        },
        onError: (error: unknown) => {
            toast.error(mutationErrorMessage(error));
        }
    });
    const riotLinkMutation = useMutation({
        mutationFn: linkRiotAccount,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.riot.me
            });
            toast.success(t("profile.linked"));
            setGameName("");
            setTagLine("");
        },
        onError: (error: unknown) => {
            toast.error(mutationErrorMessage(error));
        }
    });
    const riotUnlinkMutation = useMutation({
        mutationFn: unlinkAccount,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.riot.me
            });
            toast.success(t("profile.unlinked"));
            setGameName("");
            setTagLine("");
        },
        onError: (error: unknown) => {
            toast.error(mutationErrorMessage(error));
        }
    });
    useEffect(() => {
        if (!profile) {
            return;
        }
        (() => {
            setNickname(profile.nickname || "");
            setAvatarUrl(profile.avatarUrl || "");
            setBannerUrl(profile.bannerUrl || "");
        })();
    }, [profile]);
    if (riotLoading || accountLoading || riotConfiguration.isLoading) {
        return <p className="text-muted-foreground">{t("async.profile")}</p>;
    }
    if (profileQuery.isError)
        return <div className="rounded-xl border p-6 space-y-3"><p className="text-destructive" role="alert">{t("profile.loadError")}</p><Button variant="outline" onClick={() => profileQuery.refetch()}>{t("common.retry")}</Button></div>;
    function handleSubmit() {
        profileUpdateMutation.mutate({
            nickname,
            avatarUrl: avatarUrl || null,
            bannerUrl: bannerUrl || null
        });
    }
    function handleLinkRiot() {
        if (!gameName.trim()) {
            toast.error(t("profile.gameNameRequired"));
            return;
        }
        if (!tagLine.trim()) {
            toast.error(t("profile.tagLineRequired"));
            return;
        }
        riotLinkMutation.mutate({
            gameName,
            tagLine
        });
    }
    return (<div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {t("profile.title")}
        </h1>

        {bannerUrl && (<img src={bannerUrl} alt={t("profile.bannerAlt")} className="
                w-full
                h-40
                rounded-lg
              "/>)}

        {avatarUrl && (<img src={avatarUrl} alt={t("profile.avatarAlt")} className="
                w-20
                h-20
                rounded-lg
                object-cover
              "/>)}

        <p className="text-muted-foreground">
          {t("profile.description")}
        </p>
      </div>

      <div className="rounded-xl border p-6 space-y-4">
        <div className="space-y-2">
          <label>{t("profile.nickname")}</label>

          <Input value={nickname} onChange={(e) => setNickname(e.target.value)}/>
        </div>

        <div className="space-y-2">
          <label>{t("profile.avatarUrl")}</label>

          <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)}/>
        </div>

        <div className="space-y-2">
          <label>{t("profile.bannerUrl")}</label>

          <Input value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)}/>
        </div>

        <Button onClick={handleSubmit} disabled={profileUpdateMutation.isPending}>
          {profileUpdateMutation.isPending
            ? t("common.saving")
            : t("common.save")}
        </Button>

        {!riotAccount && riotConfiguration.data?.enabled && (<div className="rounded-xl border p-6 space-y-4">
            <h2 className="text-xl font-semibold">
              {t("profile.riot")}
            </h2>

            <Input placeholder={t("profile.gameName")} value={gameName} onChange={(e) => setGameName(e.target.value)}/>

            <Input placeholder={t("profile.tagLine")} value={tagLine} onChange={(e) => setTagLine(e.target.value)}/>

            <Button onClick={handleLinkRiot} disabled={riotLinkMutation.isPending}>
              {riotLinkMutation.isPending
                ? t("profile.linking")
                : t("profile.link")}
            </Button>
          </div>)}

        {!riotAccount && !riotConfiguration.isLoading && !riotConfiguration.data?.enabled && (<p className="text-sm text-muted-foreground">{t("profile.riotDisabled")}</p>)}

        {riotAccount && (<>
          <RiotAccountCard riotAccount={riotAccount}/>
          <Button onClick={() => riotUnlinkMutation.mutate()} disabled={riotUnlinkMutation.isPending}>
            {riotUnlinkMutation.isPending
                ? t("profile.unlinking")
                : t("profile.unlink")}
          </Button>
        </>)}
      </div>
    </div>);
}
