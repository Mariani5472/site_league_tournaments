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
  pgm.createTable("lobbies", {
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

    status: {
      type: "varchar",
      notNull: true,
      default: "waiting",
    },

    maxPlayers: {
      type: "integer",
      notNull: true
    },

    created_by: {
      type: "uuid",
      notNull: true,
      references: "users"
    }
  })
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("lobbies");
};
