exports.shorthands = undefined;

exports.up = pgm => {
  pgm.addColumns("lobbies", {
    team_selection_round: { type: "integer", notNull: true, default: 0 },
    captain_vote_ends_at: { type: "timestamp" },
  });
  pgm.createTable("lobby_team_confirmation_votes", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    lobby_id: { type: "uuid", notNull: true, references: "lobbies(id)", onDelete: "CASCADE" },
    user_id: { type: "uuid", notNull: true, references: "users(id)", onDelete: "CASCADE" },
    decision: { type: "varchar(10)", notNull: true },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
  });
  pgm.addConstraint("lobby_team_confirmation_votes", "team_confirmation_decision_check", { check: "decision IN ('accept', 'reroll')" });
  pgm.addConstraint("lobby_team_confirmation_votes", "unique_team_confirmation_vote", { unique: ["lobby_id", "user_id"] });
  pgm.createTable("lobby_captain_votes", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    lobby_id: { type: "uuid", notNull: true, references: "lobbies(id)", onDelete: "CASCADE" },
    voter_id: { type: "uuid", notNull: true, references: "users(id)", onDelete: "CASCADE" },
    candidate_id: { type: "uuid", notNull: true, references: "users(id)", onDelete: "CASCADE" },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
  });
  pgm.addConstraint("lobby_captain_votes", "unique_captain_vote", { unique: ["lobby_id", "voter_id"] });
};

exports.down = pgm => {
  pgm.dropTable("lobby_captain_votes");
  pgm.dropTable("lobby_team_confirmation_votes");
  pgm.dropColumns("lobbies", ["team_selection_round", "captain_vote_ends_at"]);
};
