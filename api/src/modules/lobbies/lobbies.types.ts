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