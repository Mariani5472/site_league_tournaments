import { useAuth } from "@/hooks/useAuth";
import type { LeagueMember } from "../types/member";
export function useLeagueRole(members: LeagueMember[]) {
    const { user } = useAuth();
    const currentMember = members.find((member) => member.userId === user?.id);
    return {
        currentMember,
        role: currentMember?.role || null,
        isOwner: currentMember?.role === 'owner',
        isAdmin: currentMember?.role === 'admin' || currentMember?.role === 'owner',
        isPlayer: currentMember?.role === 'player',
        isSpec: currentMember?.role === 'spec',
    };
}
