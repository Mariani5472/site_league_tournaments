/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * `matches` and `match_players` are the standings source of truth. Refuse to
 * silently discard unexpected legacy data so operators can inspect it first.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = pgm => {
  pgm.sql(`
    DO $$
    BEGIN
      IF to_regclass('public.standings') IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.standings) THEN
          RAISE EXCEPTION
            'cannot remove legacy standings table while it contains rows'
            USING ERRCODE = '23514';
        END IF;
      END IF;
    END;
    $$;
  `);
  pgm.dropTable("standings", { ifExists: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = pgm => {
  pgm.createTable("standings", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    league_id: { type: "uuid", notNull: true, references: "leagues", onDelete: "cascade" },
    user_id: { type: "uuid", notNull: true, references: "users", onDelete: "cascade" },
    wins: { type: "integer", notNull: true, default: 0 },
    losses: { type: "integer", notNull: true, default: 0 },
    matches_played: { type: "integer", notNull: true, default: 0 },
  });
  pgm.addConstraint("standings", "unique_user_standings_per_league", {
    unique: ["league_id", "user_id"],
  });
  pgm.sql("ALTER TABLE public.standings ENABLE ROW LEVEL SECURITY");
};
