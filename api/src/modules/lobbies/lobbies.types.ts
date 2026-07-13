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