/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable("match_votes", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    match_id: {
      type: "uuid",
      notNull: true,
      references: "matches",
      onDelete: "cascade"
    },

    voter_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "cascade"
    },

    winner_team: {
      type: "integer",
      notNull: true
    }
  })

  pgm.addConstraint("match_votes", "unique_vote_per_match", {
    unique: ["match_id", "voter_id"]
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("match_votes");
};
