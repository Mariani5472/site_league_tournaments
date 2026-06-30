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
  pgm.createTable("lobby_players", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    lobby_id: {
      type: "uuid",
      notNull: true,
      references: "lobbies",
      onDelete: "cascade"
    },

    user_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "cascade"
    },

    team_number: {
      type: "integer",
      notNull: true
    },

    is_ready: {
      type: "boolean",
      notNull: true,
      default: false
    }
  })

  pgm.addConstraint("lobby_players", "unique_user_per_lobby", {
    unique: ["lobby_id", "user_id"]
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("lobby_players");
};
