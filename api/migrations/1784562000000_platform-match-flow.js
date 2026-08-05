export const shorthands = undefined;

export const up = (pgm) => {
  pgm.addColumns("matches", {
    winner_team_number: { type: "integer" },
    resolution_type: { type: "varchar(20)" },
    resolution_reason: { type: "text" },
    resolved_by: { type: "uuid", references: "users", onDelete: "set null" },
  });
  pgm.addColumns("match_players", {
    team_number: { type: "integer" },
    nickname_snapshot: { type: "varchar(30)" },
    result: { type: "varchar(10)" },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
  });
  pgm.sql(`UPDATE match_players SET team_number = CASE
    WHEN team_id IN (1, 100) THEN 1
    WHEN team_id IN (2, 200) THEN 2
    ELSE 1
  END WHERE team_number IS NULL`);
  pgm.alterColumn("match_players", "team_number", { notNull: true });
  pgm.addColumns("match_votes", {
    created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
  });
  pgm.addConstraint("matches", "matches_winner_team_check", "CHECK (winner_team_number IS NULL OR winner_team_number IN (1, 2))");
  pgm.addConstraint("matches", "matches_resolution_type_check", "CHECK (resolution_type IS NULL OR resolution_type IN ('vote', 'admin'))");
  pgm.addConstraint("match_players", "match_players_team_check", "CHECK (team_number IN (1, 2))");
  pgm.addConstraint("match_players", "match_players_result_check", "CHECK (result IS NULL OR result IN ('win', 'loss'))");
  pgm.addConstraint("match_votes", "match_votes_team_check", "CHECK (winner_team IN (1, 2))");
  pgm.addConstraint("matches", "unique_match_per_lobby", { unique: ["lobby_id"] });
  pgm.createIndex("matches", ["league_id", "created_at"]);
  pgm.createIndex("match_players", ["user_id"]);
  pgm.createIndex("match_votes", ["match_id"]);
  pgm.dropColumns("matches", ["tournament_code", "riot_match_id", "riot_game_id", "riot_data"]);
  pgm.dropColumns("match_players", ["riot_puuid", "riot_summoner_id", "champion_id", "team_id", "win", "kills", "deaths", "assists", "gold_earned", "total_damage_dealt", "total_damage_taken", "cs"]);
  pgm.dropColumn("leagues", "require_riot_account");
};

export const down = (pgm) => {
  pgm.addColumn("leagues", "require_riot_account", { type: "boolean", notNull: true, default: false });
  pgm.addColumns("matches", {
    tournament_code: { type: "varchar(100)", unique: true }, riot_match_id: { type: "varchar(100)", unique: true },
    riot_game_id: { type: "bigint" }, riot_data: { type: "jsonb" },
  });
  pgm.addColumns("match_players", {
    riot_puuid: { type: "varchar(100)" }, riot_summoner_id: { type: "varchar(100)" }, champion_id: { type: "integer" },
    team_id: { type: "integer" }, win: { type: "boolean" }, kills: { type: "integer" }, deaths: { type: "integer" },
    assists: { type: "integer" }, gold_earned: { type: "integer" }, total_damage_dealt: { type: "integer" },
    total_damage_taken: { type: "integer" }, cs: { type: "integer" },
  });
  pgm.dropConstraint("matches", "unique_match_per_lobby");
  pgm.dropColumns("match_votes", ["created_at", "updated_at"]);
  pgm.dropColumns("match_players", ["team_number", "nickname_snapshot", "result", "created_at"]);
  pgm.dropColumns("matches", ["winner_team_number", "resolution_type", "resolution_reason", "resolved_by"]);
};
