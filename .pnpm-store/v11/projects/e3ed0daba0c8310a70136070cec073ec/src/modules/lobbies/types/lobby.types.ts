export type LobbyStatus =
  | "waiting"
  | "in_game"
  | "finished"
  | "cancelled";

export interface Lobby {
  id: string;

  status: LobbyStatus;

  max_players: number;
  players_count: number;

  available_slots: number;

  is_full: boolean;
  can_join: boolean;
}

export interface LobbyDetails {
  id: string;
  league_id: string;
  match_id: string | null;

  status: LobbyStatus;

  max_players: number;
  players_count: number;
  ready_count: number;

  available_slots: number;

  is_full: boolean;
  is_balanced: boolean;
  everyone_ready: boolean;
  can_start: boolean;

  current_player: LobbyCurrentPlayer | null;

  players: LobbyPlayer[];
  teams: LobbyTeams;
}

export interface LobbyCurrentPlayer {
  user_id: string;
  team_number: 1 | 2;
  is_ready: boolean;
}

export interface LobbyTeams {
  team_1: LobbyTeam;
  team_2: LobbyTeam;
}

export interface LobbyTeam {
  count: number;
  players: LobbyPlayer[];
}

export interface LobbyPlayer {
  user_id: string;
  nickname: string;
  avatar_url: string | null;

  team_number: 1 | 2;
  is_ready: boolean;
}
