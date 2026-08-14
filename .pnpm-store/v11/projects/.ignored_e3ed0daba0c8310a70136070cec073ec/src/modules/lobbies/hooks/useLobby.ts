import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getLobby } from "../services/lobbies.service";
export function useLobby(leagueId: string, lobbyId: string) {
    return useQuery({
        queryKey: queryKeys.lobbies.detail(leagueId, lobbyId),
        queryFn: () => getLobby(leagueId, lobbyId),
        enabled: !!leagueId && !!lobbyId,
    });
}
