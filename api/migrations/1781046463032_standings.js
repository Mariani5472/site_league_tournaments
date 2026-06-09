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
  pgm.createTable("standings", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    league_id: {
      type: "uuid",
      notNull: true,
      references: "leagues",
    },

    user_id: {
      type: "uuid",
      notNull: true,
      references: "users",
    },

    wins: {
      type: "integer",
      notNull: true,
      default: 0
    },

    losses: {
      type: "integer",
      notNull: true,
      default: 0
    },

    matches_played: {
      type: "integer",
      notNull: true,
      default: 0
    }
  })

  pgm.addConstraint("standings", "unique_user_standings_per_league", {
    unique: ["league_id", "user_id"]
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("standings");
};
