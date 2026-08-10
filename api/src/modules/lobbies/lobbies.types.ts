export type CreateLobbyDTO = {
  max_players: number;
};

export type Lobby = {
  id: string,
  league_id: string,
  status: string,
  max_players: number,
  created_by: string,
  created_at: Date
  team_selection_mode: "random" | "balanced" | "player_picks" | null,
  team_selection_completed: boolean,
  draft_captain_1: string | null,
  draft_captain_2: string | null,
  draft_pick_index: number,
  team_selection_round: number,
  captain_vote_ends_at: Date | null,
}

export type LobbyPlayer = {
  id: string,
  lobby_id: string,
  user_id: string,
  team_number: number
  is_ready: boolean,
}

export type LobbyPlayerProfile = LobbyPlayer & {
  nickname: string;
  avatar_url: string;
}
