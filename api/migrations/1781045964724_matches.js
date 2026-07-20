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
      onDelete: "cascade"
    },

    league_id: {
      type: "uuid",
      notNull: true,
      references: "leagues",
      onDelete: "cascade"
    },

    status: {
      type: "varchar",
      notNull: true,
      default: "in_game",
    },

    tournament_code: {
      type: "varchar(100)",
      unique: true,
    },

    riot_match_id: {
      type: "varchar(100)",
      unique: true,
    },

    riot_game_id: {
      type: "bigint",
    },

    started_at: {
      type: "timestamp",
    },

    finished_at: {
      type: "timestamp",
    },

    riot_data: {
      type: "jsonb",
    },

    created_at: {
      type: "timestamp",
      default: pgm.func("current_timestamp"),
    },
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
