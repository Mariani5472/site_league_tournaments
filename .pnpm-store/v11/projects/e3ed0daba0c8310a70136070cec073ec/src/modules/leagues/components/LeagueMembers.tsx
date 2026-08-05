import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { LeagueMember } from "../types/member";
import { canManageRole } from "../utils/permissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { kickMember, updateMemberRole } from "../services/leagues.service";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/queryKeys";

type Props = {
  members: LeagueMember[];
  role: | "owner" | "admin" | "player" | "spec" | null;
  isAdmin: boolean;
  leagueId: string;
};

export function LeagueMembers({ members, role, isAdmin, leagueId }: Props) {
  const queryClient = useQueryClient();

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string; }) =>
      updateMemberRole(
        leagueId,
        memberId,
        role
      ),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.leagues.members(leagueId)
      });

      toast.success(
        "Role updated"
      );
    }
  });

  const kickMutation = useMutation({
    mutationFn: (memberId: string) => kickMember(leagueId, memberId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.leagues.members(leagueId)
      });

      toast.success(
        "Member removed"
      );
    }
  });

  return (
    <div
      className="
        rounded-xl
        border
        p-6
      "
    >
      <h2
        className="
          mb-4
          text-xl
          font-semibold
        "
      >
        Members
      </h2>

      <div className="space-y-3">
        {members.length === 0 && <p className="text-muted-foreground">Nenhum membro encontrado.</p>}
        {members.map((member) => {
          const canManage = role && canManageRole(role, member.role);
          return (
            <div
              key={member.id}
              className="
                flex
                items-center
                justify-between
                rounded-lg
                border
                p-3
              "
            >
              <div>
                <div>
                  {member.nickname}
                </div>

                {member.game_name && (
                  <div
                    className="
                    text-xs
                    text-muted-foreground
                  "
                  >
                    {member.game_name}
                    #
                    {member.tag_line}
                  </div>
                )}
              </div>

              <span
                className="
                  rounded-md
                  border
                  px-2
                  py-1
                  text-xs
                "
              >
                {member.role}
              </span>

              {isAdmin && canManage && (
                <div
                  className="
                    flex
                    gap-2
                  "
                >
                  <Select
                    disabled={updateRoleMutation.isPending || kickMutation.isPending}
                    value={member.role}
                    onValueChange={(value) =>
                      updateRoleMutation.mutate({
                        memberId: member.id,
                        role: value
                      })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="admin">
                        Admin
                      </SelectItem>

                      <SelectItem value="player">
                        Player
                      </SelectItem>

                      <SelectItem value="spec">
                        Spectator
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={updateRoleMutation.isPending || kickMutation.isPending}
                    onClick={() =>
                      kickMutation.mutate(member.id)
                    }
                  >
                    Kick
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
}
