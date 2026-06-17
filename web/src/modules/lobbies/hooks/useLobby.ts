import { useQuery } from "@tanstack/react-query";
import { getLobby } from "../services/lobbies.service";

export function useLobby(
  lobbyId: string
) {
  return useQuery({
    queryKey: ["lobby", lobbyId],

    queryFn: () => getLobby(lobbyId), enabled: !!lobbyId
  });
}