export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable("league_invitations", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    league_id: {
      type: "uuid",
      notNull: true,
      references: "leagues",
      onDelete: "cascade",
    },
    recipient_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "cascade",
    },
    invited_by: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "cascade",
    },
    status: { type: "varchar(20)", notNull: true, default: "pending" },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    updated_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.addConstraint("league_invitations", "league_invitations_status_check", {
    check: "status IN ('pending', 'accepted', 'rejected', 'cancelled')",
  });
  pgm.createIndex("league_invitations", ["league_id", "recipient_id"], {
    name: "unique_pending_league_invitation",
    unique: true,
    where: "status = 'pending'",
  });
  pgm.createIndex("league_invitations", ["recipient_id", "id"], {
    name: "league_invitations_recipient_cursor_idx",
  });
  pgm.sql("ALTER TABLE public.league_invitations ENABLE ROW LEVEL SECURITY");
};

export const down = (pgm) => pgm.dropTable("league_invitations");
