import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { LeagueMember } from "../types/member";
import { canManageRole } from "../utils/permissions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { kickMember, updateMemberRole } from "../services/leagues.service";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/queryKeys";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mutationErrorMessage } from "@/services/api-errors";
import { t } from "@/i18n";
import { labelRole } from "@/i18n/labels";
type Props = {
    members: LeagueMember[];
    role: "owner" | "admin" | "player" | "spec" | null;
    isAdmin: boolean;
    leagueId: string;
};
export function LeagueMembers({ members, role, isAdmin, leagueId }: Props) {
    const queryClient = useQueryClient();
    const updateRoleMutation = useMutation({
        mutationFn: ({ memberId, role }: {
            memberId: string;
            role: string;
        }) => updateMemberRole(leagueId, memberId, role),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.leagues.members(leagueId)
            });
            toast.success(t("league.roleUpdated"));
        },
        onError: (error: unknown) => toast.error(mutationErrorMessage(error)),
    });
    const kickMutation = useMutation({
        mutationFn: (memberId: string) => kickMember(leagueId, memberId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.leagues.members(leagueId)
            });
            toast.success(t("league.memberRemoved"));
        },
        onError: (error: unknown) => toast.error(mutationErrorMessage(error)),
    });
    return (<div className="
        rounded-xl
        border
        p-6
      ">
      <h2 className="
          mb-4
          text-xl
          font-semibold
        ">
        {t("league.members")}
      </h2>

      <div className="space-y-3">
        {members.length === 0 && <p className="text-muted-foreground">{t("league.membersEmpty")}</p>}
        {members.map((member) => {
            const canManage = role && canManageRole(role, member.role);
            return (<div key={member.id} className="
                flex
                flex-wrap
                items-center
                justify-between
                gap-3
                rounded-lg
                border
                p-3
              ">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-10 w-10 border bg-muted">
                  <AvatarImage src={member.avatarUrl || undefined} alt={member.nickname}/>
                  <AvatarFallback>{member.nickname.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                <div className="truncate font-medium">{member.nickname}</div>

                {member.gameName && (<div className="
                    text-xs
                    text-muted-foreground
                  ">
                    {member.gameName}
                    #
                    {member.tagLine}
                  </div>)}
                </div>
              </div>

              <span className="
                  rounded-md
                  border
                  px-2
                  py-1
                  text-xs
                ">
                {labelRole(member.role)}
              </span>

              {isAdmin && canManage && (<div className="
                    flex
                    gap-2
                  ">
                  <Select disabled={updateRoleMutation.isPending || kickMutation.isPending} value={member.role} onValueChange={(value) => updateRoleMutation.mutate({
                        memberId: member.id,
                        role: value
                    })}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="admin">
                        {labelRole("admin")}
                      </SelectItem>

                      <SelectItem value="player">
                        {labelRole("player")}
                      </SelectItem>

                      <SelectItem value="spec">
                        {labelRole("spec")}
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="destructive" size="sm" disabled={updateRoleMutation.isPending || kickMutation.isPending} onClick={() => kickMutation.mutate(member.id)}>
                    {t("league.removeMember")}
                  </Button>
                </div>)}
            </div>);
        })}
      </div>
    </div>);
}
