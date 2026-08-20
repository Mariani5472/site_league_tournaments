export const shorthands = undefined;

export const up = pgm => {
  pgm.createTable("platform_roles", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "restrict",
    },
    role: { type: "varchar(30)", notNull: true },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    created_by: {
      type: "uuid",
      references: "users",
      onDelete: "restrict",
    },
    revoked_at: { type: "timestamp" },
    revoked_by: {
      type: "uuid",
      references: "users",
      onDelete: "restrict",
    },
  });

  pgm.addConstraint(
    "platform_roles",
    "platform_roles_role_check",
    "CHECK (role IN ('super_admin'))"
  );
  pgm.addConstraint(
    "platform_roles",
    "platform_roles_revocation_check",
    "CHECK ((revoked_at IS NULL AND revoked_by IS NULL) OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL))"
  );
  pgm.createIndex("platform_roles", ["user_id", "role"], {
    name: "platform_roles_active_user_role_unique",
    unique: true,
    where: "revoked_at IS NULL",
  });
  pgm.createIndex("platform_roles", ["role", "user_id"], {
    name: "platform_roles_active_role_lookup",
    where: "revoked_at IS NULL",
  });

  pgm.sql(`
    CREATE FUNCTION public.protect_last_super_admin() RETURNS trigger
    LANGUAGE plpgsql AS $$
    DECLARE
      removes_active_super_admin boolean := false;
    BEGIN
      IF OLD.role = 'super_admin' AND OLD.revoked_at IS NULL THEN
        IF TG_OP = 'DELETE' THEN
          removes_active_super_admin := true;
        ELSIF TG_OP = 'UPDATE' THEN
          removes_active_super_admin := NEW.revoked_at IS NOT NULL
            OR NEW.role <> 'super_admin';
        END IF;
      END IF;

      IF removes_active_super_admin THEN
        PERFORM pg_advisory_xact_lock(hashtext('platform_roles:last_super_admin'));

        IF NOT EXISTS (
          SELECT 1
          FROM public.platform_roles
          WHERE role = 'super_admin'
            AND revoked_at IS NULL
            AND id <> OLD.id
        ) THEN
          RAISE EXCEPTION 'platform must retain at least one active super admin'
            USING ERRCODE = '23514';
        END IF;
      END IF;

      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      END IF;
      RETURN NEW;
    END;
    $$;

    CREATE TRIGGER platform_roles_protect_last_super_admin
      BEFORE UPDATE OR DELETE ON public.platform_roles
      FOR EACH ROW EXECUTE FUNCTION public.protect_last_super_admin();

    ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;
  `);
};

export const down = pgm => {
  pgm.dropTable("platform_roles");
  pgm.sql("DROP FUNCTION public.protect_last_super_admin()");
};
