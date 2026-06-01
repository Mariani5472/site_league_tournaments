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
  pgm.createTable("riot_accounts", {
    id: {
      type: "uuid",
      primaryKey: true
    },

    user_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "cascade"
    },

    game_name: {
      type: "varchar(30)",
      notNull: true
    },

    tag_line: {
      type: "varchar(10)",
      notNull: true
    },

    puuid: {
      type: "text",
      unique: true
    },

    region: {
      type: "varchar(10)",
      notNull: true
    },

    summoner_level: {
      type: 'integer'
    },

    profile_icon_id: {
      type: 'integer'
    },

    verified: {
      type: "boolean",
      default: false
    },

    created_at: {
      type: "timestamp",
      default: pgm.func("current_timestamp")
    },

    linked_at: {
      type: "timestamp",
      default: pgm.func("current_timestamp")
    }
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("riot_accounts");
};
