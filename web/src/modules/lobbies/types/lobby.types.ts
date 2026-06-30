export interface LobbyPlayer {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  team_number: number;
  is_ready: boolean;
}

export interface Lobby {
  id: string;
  league_id: string;
  status: string;
  max_players: number;
  created_by: string;
  players: LobbyPlayer[];
}