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
  pgm.createTable(
    "league_join_requests",
    {
      id: {
        type: "uuid",
        primaryKey: true,
        default: pgm.func("gen_random_uuid()"),
      },

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

      status: {
        type: "varchar(20)",
        notNull: true
      },

      created_at: {
        type: "timestamp",
        default: pgm.func("current_timestamp")
      }
    }
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("league_join_requests");
};
