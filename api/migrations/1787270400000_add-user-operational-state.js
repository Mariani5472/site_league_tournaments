exports.up = pgm => {
  pgm.addColumns("users", {
    operational_status: { type: "varchar(20)", notNull: true, default: "active" },
    restriction_reason: { type: "varchar(500)" },
    suspended_until: { type: "timestamp with time zone" },
    restricted_at: { type: "timestamp with time zone" },
    restricted_by: { type: "uuid", references: "users", onDelete: "RESTRICT" },
    session_revocation_status: { type: "varchar(20)", notNull: true, default: "not_required" },
    session_revocation_attempted_at: { type: "timestamp with time zone" },
  });
  pgm.addConstraint("users", "users_operational_status_check",
    "CHECK (operational_status IN ('active', 'suspended', 'banned'))");
  pgm.addConstraint("users", "users_session_revocation_status_check",
    "CHECK (session_revocation_status IN ('not_required', 'pending', 'succeeded', 'failed'))");
  pgm.addConstraint("users", "users_operational_state_check", `CHECK (
    (operational_status = 'active' AND restriction_reason IS NULL AND suspended_until IS NULL)
    OR (operational_status = 'suspended' AND restriction_reason IS NOT NULL AND suspended_until IS NOT NULL)
    OR (operational_status = 'banned' AND restriction_reason IS NOT NULL AND suspended_until IS NULL)
  )`);
  pgm.createIndex("users", ["operational_status", "suspended_until"], {
    name: "users_operational_status_index",
  });

  pgm.dropConstraint("platform_audit_logs", "platform_audit_logs_action_check");
  pgm.dropConstraint("platform_audit_logs", "platform_audit_logs_metadata_check");
  pgm.addConstraint("platform_audit_logs", "platform_audit_logs_action_check",
    "CHECK (action IN ('platform_role.granted', 'platform_role.revoked', 'user.suspended', 'user.unsuspended'))");
  pgm.addConstraint("platform_audit_logs", "platform_audit_logs_metadata_check", `CHECK (
    jsonb_typeof(metadata) = 'object' AND (
      (action IN ('platform_role.granted', 'platform_role.revoked')
        AND metadata - 'role' = '{}'::jsonb AND metadata ? 'role'
        AND metadata ->> 'role' IN ('super_admin'))
      OR (action = 'user.suspended'
        AND metadata - ARRAY['status', 'suspendedUntil', 'sessionRevocationStatus'] = '{}'::jsonb
        AND metadata ->> 'status' = 'suspended'
        AND metadata ->> 'sessionRevocationStatus' = 'pending')
      OR (action = 'user.unsuspended'
        AND metadata - 'status' = '{}'::jsonb AND metadata ->> 'status' = 'active')
    )
  )`);
};

exports.down = pgm => {
  pgm.dropConstraint("platform_audit_logs", "platform_audit_logs_metadata_check");
  pgm.dropConstraint("platform_audit_logs", "platform_audit_logs_action_check");
  pgm.addConstraint("platform_audit_logs", "platform_audit_logs_action_check",
    "CHECK (action IN ('platform_role.granted', 'platform_role.revoked'))");
  pgm.addConstraint("platform_audit_logs", "platform_audit_logs_metadata_check",
    "CHECK (jsonb_typeof(metadata) = 'object' AND metadata - 'role' = '{}'::jsonb AND metadata ? 'role' AND metadata ->> 'role' IN ('super_admin'))");
  pgm.dropColumns("users", ["operational_status", "restriction_reason", "suspended_until",
    "restricted_at", "restricted_by", "session_revocation_status", "session_revocation_attempted_at"]);
};
