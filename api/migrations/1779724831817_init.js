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
  pgm.createTable("users", {
    id: {
      type: "uuid",
      primaryKey: true
    },

    email: {
      type: "varchar(255)",
      notNull: true,
      unique: true
    },

    nickname: {
      type: "varchar(30)",
      notNull: true,
      unique: true
    },

    avatar_url: {
      type: "text"
    },

    banner_url: {
      type: "text"
    },

    bio: {
      type: "text"
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
  pgm.dropTable("users");
};
