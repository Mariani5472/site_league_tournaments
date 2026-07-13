import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";

import {
  joinLobby,
  leaveLobby,
  toggleReady,
  changeTeam,
  toggleUnready,
  deleteLobby
} from "../services/lobbies.service";

export function useLobbyActions(
  leagueId: string,
  lobbyId: string
) {
  const queryClient = useQueryClient();

  function invalidateLobby() {
    queryClient.invalidateQueries({
      queryKey: ["lobby", leagueId, lobbyId]
    });

    queryClient.invalidateQueries({
      queryKey: ["league-lobbies"]
    });
  }

  const joinMutation = useMutation({
    mutationFn: () => joinLobby(leagueId, lobbyId),

    onSuccess: () => {
      invalidateLobby();
      toast.success("Joined lobby");

    },

    onError: (error: Error) => {
      toast.error(error.message);

    }
  });

  const leaveMutation = useMutation({

    mutationFn: () => leaveLobby(leagueId, lobbyId),

    onSuccess: () => {
      invalidateLobby();
      toast.success("Left lobby");
    },

    onError: (error: Error) => {
      toast.error(error.message);
    }

  });

  const readyMutation = useMutation({
    mutationFn: () => toggleReady(leagueId, lobbyId),
    onSuccess: () => {
      invalidateLobby();
    },

    onError: (error: Error) => {
      toast.error(error.message);
    }

  });

  const unreadyMutation = useMutation({
    mutationFn: () => toggleUnready(leagueId, lobbyId),
    onSuccess: () => {
      invalidateLobby();
    },

    onError: (error: Error) => {
      toast.error(error.message);
    }

  });

  const changeTeamMutation = useMutation({
    mutationFn: () => changeTeam(leagueId, lobbyId,),

    onSuccess: () => {
      invalidateLobby();
    },

    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const deleteLobbyMutation = useMutation({
    mutationFn: () => deleteLobby(leagueId, lobbyId),

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
    unready: unreadyMutation.mutate,
    switchTeam: changeTeamMutation.mutate,
    deleteLobby: deleteLobbyMutation.mutate,
    isJoining: joinMutation.isPending,
    isLeaving: leaveMutation.isPending,
    isReadyLoading: readyMutation.isPending,
    isUnreadyLoading: unreadyMutation.isPending,
    isChangingTeam: changeTeamMutation.isPending,
    isDeleting: deleteLobbyMutation.isPending,
    isLoading:
      joinMutation.isPending ||
      leaveMutation.isPending ||
      readyMutation.isPending ||
      unreadyMutation.isPending ||
      changeTeamMutation.isPending ||
      deleteLobbyMutation.isPending
  };
}