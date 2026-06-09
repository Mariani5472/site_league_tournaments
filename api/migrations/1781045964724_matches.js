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
  pgm.createTable("matches", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    lobby_id: {
      type: "uuid",
      notNull: true,
      references: "lobbies",
    },

    league_id: {
      type: "uuid",
      notNull: true,
      references: "leagues",
    },

    status: {
      type: "varchar",
      notNull: true,
      default: "in_game",
    },

    created_at: {
      type: "timestamp",
      default: pgm.func("current_timestamp")
    }
  })
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("matches");
};
