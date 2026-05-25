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
  pgm.createTable("league_members", {
    league_id: {
      type: "uuid",
      notNull: true,
      references: "leagues",
      onDelete: "cascade"
    },

    user_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "cascade"
    },

    role: {
      type: "varchar(20)",
      notNull: true
    },

    wins: {
      type: "integer",
      default: 0
    },

    losses: {
      type: "integer",
      default: 0
    },

    created_at: {
      type: "timestamp",
      default: pgm.func("current_timestamp")
    }
  });

  pgm.addConstraint(
    "league_members",
    "unique_user_per_league",
    {
      unique: ["league_id", "user_id"]
    }
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("league_members");
};
