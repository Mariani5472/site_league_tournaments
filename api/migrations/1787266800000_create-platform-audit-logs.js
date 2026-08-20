export const shorthands = undefined;

export const up = pgm => {
  pgm.createTable("platform_audit_logs", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    actor_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "restrict",
    },
    action: { type: "varchar(50)", notNull: true },
    target_type: { type: "varchar(50)", notNull: true },
    target_id: { type: "uuid", notNull: true },
    reason: { type: "varchar(500)", notNull: true },
    metadata: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
    correlation_id: { type: "varchar(100)", notNull: true },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  pgm.addConstraint(
    "platform_audit_logs",
    "platform_audit_logs_action_check",
    "CHECK (action IN ('platform_role.granted', 'platform_role.revoked'))"
  );
  pgm.addConstraint(
    "platform_audit_logs",
    "platform_audit_logs_target_type_check",
    "CHECK (target_type IN ('user'))"
  );
  pgm.addConstraint(
    "platform_audit_logs",
    "platform_audit_logs_reason_check",
    "CHECK (char_length(btrim(reason)) BETWEEN 10 AND 500)"
  );
  pgm.addConstraint(
    "platform_audit_logs",
    "platform_audit_logs_metadata_check",
    "CHECK (jsonb_typeof(metadata) = 'object' AND metadata - 'role' = '{}'::jsonb AND metadata ? 'role' AND metadata ->> 'role' IN ('super_admin'))"
  );
  pgm.addConstraint(
    "platform_audit_logs",
    "platform_audit_logs_correlation_check",
    "CHECK (correlation_id ~ '^[A-Za-z0-9._:-]{1,100}$')"
  );
  pgm.createIndex("platform_audit_logs", ["created_at", "id"], {
    name: "platform_audit_logs_cursor_index",
  });
  pgm.createIndex("platform_audit_logs", ["actor_id", "created_at"], {
    name: "platform_audit_logs_actor_index",
  });
  pgm.createIndex("platform_audit_logs", ["target_type", "target_id", "created_at"], {
    name: "platform_audit_logs_target_index",
  });
  pgm.createIndex("platform_audit_logs", ["action", "created_at"], {
    name: "platform_audit_logs_action_index",
  });

  pgm.sql(`
    CREATE FUNCTION public.protect_platform_audit_logs() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      RAISE EXCEPTION 'platform audit logs are append-only'
        USING ERRCODE = '23514';
    END;
    $$;

    CREATE TRIGGER platform_audit_logs_append_only
      BEFORE UPDATE OR DELETE ON public.platform_audit_logs
      FOR EACH ROW EXECUTE FUNCTION public.protect_platform_audit_logs();

    ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;
  `);
};

export const down = pgm => {
  pgm.dropTable("platform_audit_logs");
  pgm.sql("DROP FUNCTION public.protect_platform_audit_logs()");
};
