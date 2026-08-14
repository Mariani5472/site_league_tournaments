export const shorthands = undefined;

export const up = (pgm) => {
  pgm.addConstraint("leagues", "leagues_visibility_check", "CHECK (visibility IN ('public', 'private'))");
  pgm.addConstraint("leagues", "leagues_join_policy_check", "CHECK (join_policy IN ('open', 'request', 'invite_only'))");
  pgm.addConstraint("leagues", "leagues_max_players_check", "CHECK (max_players BETWEEN 2 AND 500)");
  pgm.addConstraint("league_members", "league_members_role_check", "CHECK (role IN ('owner', 'admin', 'player', 'spec'))");
  pgm.addConstraint("league_join_requests", "league_requests_status_check", "CHECK (status IN ('pending', 'approved', 'rejected'))");
  pgm.addConstraint("lobbies", "lobbies_status_check", "CHECK (status IN ('waiting', 'in_game', 'finished', 'cancelled'))");
  pgm.addConstraint("lobby_players", "lobby_players_team_check", "CHECK (team_number IN (1, 2))");
  pgm.createIndex("league_join_requests", ["league_id", "user_id"], {
    name: "unique_pending_join_request", unique: true, where: "status = 'pending'"
  });
  pgm.createIndex("lobbies", ["league_id"], {
    name: "unique_waiting_lobby_per_league", unique: true, where: "status = 'waiting'"
  });
};

export const down = (pgm) => {
  pgm.dropIndex("lobbies", ["league_id"], { name: "unique_waiting_lobby_per_league" });
  pgm.dropIndex("league_join_requests", ["league_id", "user_id"], { name: "unique_pending_join_request" });
  pgm.dropConstraint("lobby_players", "lobby_players_team_check");
  pgm.dropConstraint("lobbies", "lobbies_status_check");
  pgm.dropConstraint("league_join_requests", "league_requests_status_check");
  pgm.dropConstraint("league_members", "league_members_role_check");
  pgm.dropConstraint("leagues", "leagues_max_players_check");
  pgm.dropConstraint("leagues", "leagues_join_policy_check");
  pgm.dropConstraint("leagues", "leagues_visibility_check");
};
