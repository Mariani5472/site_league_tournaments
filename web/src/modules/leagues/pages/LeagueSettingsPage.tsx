import { useEffect, useMemo } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useLeague } from "../hooks/useLeague";
import { useUpdateLeague } from "../hooks/useUpdateLeague";
import { useLeagueMembers } from "../hooks/useLeagueMembers";
import { useLeagueRole } from "../hooks/useLeagueRole";
import { leagueSettingsSchema, type LeagueSettingsForm } from "../utils/leagueSettings.schema";
import { DangerZone } from "../components/DangerZone";
import { ArrowLeft, Save } from "lucide-react";
import { t } from "@/i18n";
import { labelJoinPolicy, labelVisibility } from "@/i18n/labels";
import { mutationErrorMessage } from "@/services/api-errors";
export function LeagueSettingsPage() {
    const { id } = useParams();
    const leagueId = id!;
    const { data: league, isLoading } = useLeague(leagueId);
    const { data: members, isLoading: areMembersLoading } = useLeagueMembers(leagueId);
    const roleData = useLeagueRole(members || []);
    const mutation = useUpdateLeague();
    const formValues = useMemo<LeagueSettingsForm | undefined>(
        () =>
            league
                ? {
                      name: league.name,
                      description: league.description || "",
                      visibility: league.visibility,
                      joinPolicy: league.joinPolicy,
                      maxPlayers: league.maxPlayers,
                      lobbyCreationPolicy: league.lobbyCreationPolicy ?? "admins",
                      autoStartLobby: league.autoStartLobby ?? false,
                      avatarUrl: league.avatarUrl ?? "",
                      bannerUrl: league.bannerUrl ?? "",
                  }
                : undefined,
        [league]
    );
    const { register, handleSubmit, setValue, reset, formState, control } =
        useForm<LeagueSettingsForm>({
            resolver: zodResolver(leagueSettingsSchema),
            defaultValues: formValues ?? {
                name: "",
                description: "",
                visibility: "private",
                joinPolicy: "request",
                maxPlayers: 10,
                lobbyCreationPolicy: "admins",
                autoStartLobby: false,
                avatarUrl: "",
                bannerUrl: "",
            },
        });
    const [visibilityValue, joinPolicyValue, lobbyCreationPolicy, autoStartLobby] = useWatch({
        control,
        name: ["visibility", "joinPolicy", "lobbyCreationPolicy", "autoStartLobby"],
    });
    useEffect(() => {
        if (formValues) {
            reset(formValues);
        }
    }, [formValues, reset]);
    const isAuthorizationLoading = isLoading || areMembersLoading;
    if (!isAuthorizationLoading && !roleData.isAdmin) {
        return <Navigate to={`/leagues/${leagueId}`} />;
    }
    function onSubmit(data: LeagueSettingsForm) {
        mutation.mutate(
            {
                leagueId,
                data: {
                    ...data,
                    avatarUrl: data.avatarUrl || null,
                    bannerUrl: data.bannerUrl || null,
                },
            },
            {
                onSuccess: () => {
                    toast.success(t("settings.updated"));
                },
                onError: (error: unknown) => {
                    toast.error(mutationErrorMessage(error));
                },
            }
        );
    }
    if (isAuthorizationLoading || !league) {
        return <div>{t("common.loading")}</div>;
    }
    return (
        <div
            className="
        mx-auto
        max-w-4xl
        space-y-6
      "
        >
            <Button variant="ghost" asChild>
                <Link to={`/leagues/${leagueId}`}>
                    <ArrowLeft className="h-4 w-4" /> {t("settings.back")}
                </Link>
            </Button>
            <div>
                <h1
                    className="
            text-3xl
            font-bold
          "
                >
                    {t("settings.title")}
                </h1>

                <p
                    className="
            text-muted-foreground
          "
                >
                    {t("settings.description")}
                </p>
            </div>

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="
          rounded-xl
          border
          p-6
          space-y-6
        "
            >
                <div>
                    <label htmlFor="league-name">{t("league.name")}</label>

                    <Input id="league-name" {...register("name")} />
                </div>

                <div>
                    <label htmlFor="league-description">{t("league.descriptionLabel")}</label>

                    <Input id="league-description" {...register("description")} />
                </div>

                <div>
                    <label htmlFor="league-avatar-url">{t("settings.avatarUrl")}</label>
                    <Input
                        id="league-avatar-url"
                        type="url"
                        inputMode="url"
                        placeholder="https://"
                        aria-describedby="league-avatar-help league-avatar-error"
                        {...register("avatarUrl")}
                    />
                    <p id="league-avatar-help" className="mt-1 text-sm text-muted-foreground">
                        {t("settings.avatarHelp")}
                    </p>
                    {formState.errors.avatarUrl && (
                        <p
                            id="league-avatar-error"
                            role="alert"
                            className="mt-1 text-sm text-destructive"
                        >
                            {formState.errors.avatarUrl.message}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="league-banner-url">{t("settings.bannerUrl")}</label>
                    <Input
                        id="league-banner-url"
                        type="url"
                        inputMode="url"
                        placeholder="https://"
                        aria-describedby="league-banner-help league-banner-error"
                        {...register("bannerUrl")}
                    />
                    <p id="league-banner-help" className="mt-1 text-sm text-muted-foreground">
                        {t("settings.bannerHelp")}
                    </p>
                    {formState.errors.bannerUrl && (
                        <p
                            id="league-banner-error"
                            role="alert"
                            className="mt-1 text-sm text-destructive"
                        >
                            {formState.errors.bannerUrl.message}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="league-visibility">{t("league.visibility")}</label>

                    <Select
                        value={visibilityValue || ""}
                        onValueChange={value =>
                            setValue("visibility", value as "public" | "private")
                        }
                    >
                        <SelectTrigger id="league-visibility">
                            <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="public">{labelVisibility("public")}</SelectItem>

                            <SelectItem value="private">{labelVisibility("private")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <label htmlFor="league-join-policy">{t("league.joinPolicy")}</label>

                    <Select
                        value={joinPolicyValue || ""}
                        onValueChange={value =>
                            setValue("joinPolicy", value as "open" | "request" | "invite_only")
                        }
                    >
                        <SelectTrigger id="league-join-policy">
                            <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="open">{labelJoinPolicy("open")}</SelectItem>

                            <SelectItem value="request">{labelJoinPolicy("request")}</SelectItem>

                            <SelectItem value="invite_only">
                                {labelJoinPolicy("invite_only")}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <label htmlFor="league-max-players">{t("league.maxPlayers")}</label>

                    <Input
                        type="number"
                        id="league-max-players"
                        {...register("maxPlayers", {
                            valueAsNumber: true,
                        })}
                    />
                </div>

                <div>
                    <label htmlFor="lobby-creation-policy">
                        {t("settings.lobbyCreationPolicy")}
                    </label>
                    <Select
                        value={lobbyCreationPolicy}
                        onValueChange={value =>
                            setValue("lobbyCreationPolicy", value as "admins" | "members")
                        }
                    >
                        <SelectTrigger id="lobby-creation-policy">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="admins">
                                {t("settings.lobbyCreationAdmins")}
                            </SelectItem>
                            <SelectItem value="members">
                                {t("settings.lobbyCreationMembers")}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                    <div>
                        <label htmlFor="auto-start-lobby">{t("settings.autoStartLobby")}</label>
                        <p className="text-sm text-muted-foreground">
                            {t("settings.autoStartLobbyDescription")}
                        </p>
                    </div>
                    <Switch
                        id="auto-start-lobby"
                        checked={autoStartLobby}
                        onCheckedChange={checked => setValue("autoStartLobby", checked)}
                    />
                </div>

                <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? (
                        t("common.saving")
                    ) : (
                        <>
                            <Save className="h-4 w-4" /> {t("common.save")}
                        </>
                    )}
                </Button>
            </form>

            {roleData.isOwner && <DangerZone leagueId={leagueId} leagueName={league.name} />}
        </div>
    );
}
