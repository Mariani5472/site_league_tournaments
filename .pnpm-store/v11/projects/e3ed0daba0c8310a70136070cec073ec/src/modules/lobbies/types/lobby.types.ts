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
  team_selection: TeamSelection | null;
}

export type TeamSelectionMode = "random" | "balanced" | "player_picks";
export interface TeamSelection {
  available: boolean; can_vote: boolean; mode: TeamSelectionMode | null; completed: boolean; majority_required: number;
  my_vote: TeamSelectionMode | null; votes: Record<TeamSelectionMode, number>;
  round: number;
  confirmation: null | { my_vote: "accept" | "reroll" | null; votes: Record<"accept" | "reroll", number> };
  captain_vote: null | { ends_at: string; my_vote: string | null; candidates: Array<Pick<LobbyPlayer, "user_id" | "nickname" | "avatar_url"> & { votes: number }> };
  draft: null | { captain_1: string; captain_2: string; next_team: 1 | 2 | null; pick_index: number; picks: Array<LobbyPlayer & { pick_number: number }>; available_players: LobbyPlayer[] };
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
