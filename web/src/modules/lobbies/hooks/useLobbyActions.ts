import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";

import {
  joinLobby,
  leaveLobby,
  toggleReady,
  changeTeam
} from "../services/lobbies.service";

export function useLobbyActions(
  lobbyId: string
) {
  const queryClient = useQueryClient();

  function invalidateLobby() {
    queryClient.invalidateQueries({
      queryKey: ["lobby", lobbyId]
    });

    queryClient.invalidateQueries({
      queryKey: ["league-lobbies"]
    });
  }

  const joinMutation = useMutation({
    mutationFn: () => joinLobby(lobbyId),

    onSuccess: () => {
      invalidateLobby();
      toast.success("Joined lobby");

    },

    onError: (error: Error) => {
      toast.error(error.message);

    }
  });

  const leaveMutation = useMutation({

    mutationFn: () => leaveLobby(lobbyId),

    onSuccess: () => {
      invalidateLobby();
      toast.success("Left lobby");
    },

    onError: (error: Error) => {
      toast.error(error.message);
    }

  });

  const readyMutation = useMutation({
    mutationFn: () => toggleReady(lobbyId),
    onSuccess: () => {
      invalidateLobby();
    },

    onError: (error: Error) => {
      toast.error(error.message);
    }

  });

  const changeTeamMutation = useMutation({
    mutationFn: () => changeTeam(lobbyId,),

    onSuccess: () => {
      invalidateLobby();
    },

    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  return {

    join: joinMutation.mutate,

    leave: leaveMutation.mutate,

    ready: readyMutation.mutate,

    switchTeam: changeTeamMutation.mutate,

    isJoining: joinMutation.isPending,

    isLeaving: leaveMutation.isPending,

    isReadyLoading: readyMutation.isPending,

    isChangingTeam: changeTeamMutation.isPending,

    isLoading:
      joinMutation.isPending ||
      leaveMutation.isPending ||
      readyMutation.isPending ||
      changeTeamMutation.isPending
  };
}