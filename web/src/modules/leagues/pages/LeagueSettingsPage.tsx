import { useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";

import { useForm, useWatch } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

import {
  useLeague
} from "../hooks/useLeague";

import {
  useUpdateLeague
} from "../hooks/useUpdateLeague";



import {
  useLeagueMembers
} from "../hooks/useLeagueMembers";

import {
  useLeagueRole
} from "../hooks/useLeagueRole";
import { leagueSettingsSchema, type LeagueSettingsForm } from "../utils/leagueSettings.schema";
import { DangerZone } from "../components/DangerZone";

export function LeagueSettingsPage() {
  const { id } = useParams();

  const leagueId = id!;

  const {
    data: league,
    isLoading
  } = useLeague(leagueId);

  const { data: members } = useLeagueMembers(leagueId);

  const roleData = useLeagueRole(members || []);
  const mutation = useUpdateLeague();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
  } = useForm<LeagueSettingsForm>({
    resolver: zodResolver(leagueSettingsSchema)
  });

  const visibilityValue = useWatch({ 
    control, 
    name: "visibility", 
    defaultValue: league?.visibility
  });
  const joinPolicyValue = useWatch({ 
    control, 
    name: "join_policy",
    defaultValue: league?.join_policy
  });

  useEffect(() => {
    if (!league) {
      return;
    }

    reset({
      name: league.name,
      description: league.description || "",
      visibility: league.visibility,
      join_policy: league.join_policy,
      max_players: league.max_players
    });
  }, [league, reset]);

  if (!isLoading && !roleData.isAdmin) {
    return (
      <Navigate
        to={`/leagues/${leagueId}`}
      />
    );
  }

  function onSubmit(data: LeagueSettingsForm) {
    mutation.mutate(
      {leagueId, data},
      {
        onSuccess: () => {
          toast.success("League updated");
        },

        onError: (error: Error) => {
          toast.error(error.message);
        }
      }
    );
  }

  if (isLoading || !league) {
    return (
      <div>
        Loading...
      </div>
    );
  }

  return (
    <div
      className="
        mx-auto
        max-w-4xl
        space-y-6
      "
    >
      <div>
        <h1
          className="
            text-3xl
            font-bold
          "
        >
          League Settings
        </h1>

        <p
          className="
            text-muted-foreground
          "
        >
          Manage your league.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(
          onSubmit
        )}
        className="
          rounded-xl
          border
          p-6
          space-y-6
        "
      >
        <div>
          <label>
            League Name
          </label>

          <Input
            {...register(
              "name"
            )}
          />
        </div>

        <div>
          <label>
            Description
          </label>

          <Input
            {...register(
              "description"
            )}
          />
        </div>

        <div>
          <label>
            Visibility
          </label>

          <Select
            value={visibilityValue || ""}
            onValueChange={(value) => setValue("visibility",
                value as | "public" | "private"
              )}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="public">
                Public
              </SelectItem>

              <SelectItem value="private">
                Private
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label>
            Join Policy
          </label>

          <Select
            value={joinPolicyValue || ""}
            onValueChange={(
              value
            ) =>
              setValue(
                "join_policy",
                value as
                  | "open"
                  | "request"
                  | "invite_only"
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="open">
                Open
              </SelectItem>

              <SelectItem value="request">
                Request Approval
              </SelectItem>

              <SelectItem value="invite_only">
                Invite Only
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label>
            Max Players
          </label>

          <Input
            type="number"
            {...register(
              "max_players",
              {
                valueAsNumber: true
              }
            )}
          />
        </div>

        <Button
          type="submit"
          disabled={
            mutation.isPending
          }
        >
          {mutation.isPending
            ? "Saving..."
            : "Save Changes"}
        </Button>
      </form>

      {roleData.isOwner && (
        <DangerZone
          leagueId={leagueId}
        />
      )}
    </div>
  );
}