import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { PlayerProfileView } from "../components/PlayerProfileView";
import { usePublicProfile } from "../hooks/usePublicProfile";

export function PublicProfilePage() {
    const { userId = "" } = useParams();
    const profile = usePublicProfile(userId);
    if (profile.isLoading) return <p>{t("async.profile")}</p>;
    if (profile.isError || !profile.data)
        return (
            <div className="rounded-xl border p-6">
                <p role="alert" className="text-destructive">
                    {t("profile.publicLoadError")}
                </p>
                <Button className="mt-3" variant="outline" onClick={() => profile.refetch()}>
                    {t("common.retry")}
                </Button>
            </div>
        );
    return <PlayerProfileView profile={profile.data} />;
}
