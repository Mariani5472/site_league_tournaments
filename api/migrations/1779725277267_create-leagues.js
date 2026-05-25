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
  pgm.createTable("leagues", {
    id: {
      type: "uuid",
      primaryKey: true
    },

    owner_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "cascade"
    },

    name: {
      type: "varchar(100)",
      notNull: true
    },

    description: {
      type: "text"
    },

    visibility: {
      type: "varchar(20)",
      notNull: true
    },

    join_policy: {
      type: "varchar(20)",
      notNull: true
    },

    max_players: {
      type: "integer",
      notNull: true
    },

    created_at: {
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
  pgm.dropTable("leagues");
};
