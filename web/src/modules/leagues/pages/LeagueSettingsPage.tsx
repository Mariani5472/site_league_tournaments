import { useEffect } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    const { register, handleSubmit, setValue, reset, control, } = useForm<LeagueSettingsForm>({
        resolver: zodResolver(leagueSettingsSchema)
    });
    const visibilityValue = useWatch({
        control,
        name: "visibility",
        defaultValue: league?.visibility
    });
    const joinPolicyValue = useWatch({
        control,
        name: "joinPolicy",
        defaultValue: league?.joinPolicy
    });
    useEffect(() => {
        if (!league) {
            return;
        }
        reset({
            name: league.name,
            description: league.description || "",
            visibility: league.visibility,
            joinPolicy: league.joinPolicy,
            maxPlayers: league.maxPlayers
        });
    }, [league, reset]);
    const isAuthorizationLoading = isLoading || areMembersLoading;
    if (!isAuthorizationLoading && !roleData.isAdmin) {
        return (<Navigate to={`/leagues/${leagueId}`}/>);
    }
    function onSubmit(data: LeagueSettingsForm) {
        mutation.mutate({ leagueId, data }, {
            onSuccess: () => {
                toast.success(t("settings.updated"));
            },
            onError: (error: unknown) => {
                toast.error(mutationErrorMessage(error));
            }
        });
    }
    if (isAuthorizationLoading || !league) {
        return (<div>
        {t("common.loading")}
      </div>);
    }
    return (<div className="
        mx-auto
        max-w-4xl
        space-y-6
      ">
      <Button variant="ghost" asChild><Link to={`/leagues/${leagueId}`}><ArrowLeft className="h-4 w-4"/> {t("settings.back")}</Link></Button>
      <div>
        <h1 className="
            text-3xl
            font-bold
          ">
          {t("settings.title")}
        </h1>

        <p className="
            text-muted-foreground
          ">
          {t("settings.description")}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="
          rounded-xl
          border
          p-6
          space-y-6
        ">
        <div>
          <label>
            {t("league.name")}
          </label>

          <Input {...register("name")}/>
        </div>

        <div>
          <label>
            {t("league.descriptionLabel")}
          </label>

          <Input {...register("description")}/>
        </div>

        <div>
          <label>
            {t("league.visibility")}
          </label>

          <Select value={visibilityValue || ""} onValueChange={(value) => setValue("visibility", value as "public" | "private")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="public">
                {labelVisibility("public")}
              </SelectItem>

              <SelectItem value="private">
                {labelVisibility("private")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label>
            {t("league.joinPolicy")}
          </label>

          <Select value={joinPolicyValue || ""} onValueChange={(value) => setValue("joinPolicy", value as "open" | "request" | "invite_only")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="open">
                {labelJoinPolicy("open")}
              </SelectItem>

              <SelectItem value="request">
                {labelJoinPolicy("request")}
              </SelectItem>

              <SelectItem value="invite_only">
                {labelJoinPolicy("invite_only")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label>
            {t("league.maxPlayers")}
          </label>

          <Input type="number" {...register("maxPlayers", {
        valueAsNumber: true
    })}/>
        </div>

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? t("common.saving")
            : <><Save className="h-4 w-4"/> {t("common.save")}</>}
        </Button>
      </form>

      {roleData.isOwner && (<DangerZone leagueId={leagueId} leagueName={league.name}/>)}
    </div>);
}
