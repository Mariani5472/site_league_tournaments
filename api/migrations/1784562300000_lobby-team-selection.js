exports.shorthands = undefined;

exports.up = pgm => {
  pgm.addColumns("lobbies", {
    team_selection_mode: { type: "varchar(20)" },
    team_selection_completed: { type: "boolean", notNull: true, default: false },
    draft_captain_1: { type: "uuid", references: "users(id)", onDelete: "SET NULL" },
    draft_captain_2: { type: "uuid", references: "users(id)", onDelete: "SET NULL" },
    draft_pick_index: { type: "integer", notNull: true, default: 0 },
  });
  pgm.addConstraint("lobbies", "lobbies_team_selection_mode_check", {
    check: "team_selection_mode IS NULL OR team_selection_mode IN ('random', 'balanced', 'player_picks')",
  });
  pgm.createTable("lobby_team_selection_votes", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    lobby_id: { type: "uuid", notNull: true, references: "lobbies(id)", onDelete: "CASCADE" },
    user_id: { type: "uuid", notNull: true, references: "users(id)", onDelete: "CASCADE" },
    mode: { type: "varchar(20)", notNull: true },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
  });
  pgm.addConstraint("lobby_team_selection_votes", "lobby_team_selection_votes_mode_check", {
    check: "mode IN ('random', 'balanced', 'player_picks')",
  });
  pgm.addConstraint("lobby_team_selection_votes", "unique_team_selection_vote", { unique: ["lobby_id", "user_id"] });
  pgm.createTable("lobby_draft_picks", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    lobby_id: { type: "uuid", notNull: true, references: "lobbies(id)", onDelete: "CASCADE" },
    user_id: { type: "uuid", notNull: true, references: "users(id)", onDelete: "CASCADE" },
    team_number: { type: "integer", notNull: true },
    pick_number: { type: "integer", notNull: true },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
  });
  pgm.addConstraint("lobby_draft_picks", "unique_lobby_draft_player", { unique: ["lobby_id", "user_id"] });
  pgm.addConstraint("lobby_draft_picks", "unique_lobby_draft_pick", { unique: ["lobby_id", "pick_number"] });
};

exports.down = pgm => {
  pgm.dropTable("lobby_draft_picks");
  pgm.dropTable("lobby_team_selection_votes");
  pgm.dropConstraint("lobbies", "lobbies_team_selection_mode_check");
  pgm.dropColumns("lobbies", ["team_selection_mode", "team_selection_completed", "draft_captain_1", "draft_captain_2", "draft_pick_index"]);
};
