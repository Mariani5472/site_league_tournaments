alter table public.users
  add column operational_status varchar(20) not null default 'active',
  add column restriction_reason varchar(500),
  add column suspended_until timestamptz,
  add column restricted_at timestamptz,
  add column restricted_by uuid references public.users(id) on delete restrict,
  add column session_revocation_status varchar(20) not null default 'not_required',
  add column session_revocation_attempted_at timestamptz,
  add constraint users_operational_status_check
    check (operational_status in ('active', 'suspended', 'banned')),
  add constraint users_session_revocation_status_check
    check (session_revocation_status in ('not_required', 'pending', 'succeeded', 'failed')),
  add constraint users_operational_state_check check (
    (operational_status = 'active' and restriction_reason is null and suspended_until is null)
    or (operational_status = 'suspended' and restriction_reason is not null and suspended_until is not null)
    or (operational_status = 'banned' and restriction_reason is not null and suspended_until is null)
  );

create index users_operational_status_index
  on public.users (operational_status, suspended_until);

alter table public.platform_audit_logs
  drop constraint platform_audit_logs_action_check,
  drop constraint platform_audit_logs_metadata_check,
  add constraint platform_audit_logs_action_check check (
    action in ('platform_role.granted', 'platform_role.revoked', 'user.suspended', 'user.unsuspended')
  ),
  add constraint platform_audit_logs_metadata_check check (
    jsonb_typeof(metadata) = 'object' and (
      (action in ('platform_role.granted', 'platform_role.revoked')
        and metadata - 'role' = '{}'::jsonb and metadata ? 'role'
        and metadata ->> 'role' in ('super_admin'))
      or (action = 'user.suspended'
        and metadata - array['status', 'suspendedUntil', 'sessionRevocationStatus'] = '{}'::jsonb
        and metadata ->> 'status' = 'suspended'
        and metadata ->> 'sessionRevocationStatus' = 'pending')
      or (action = 'user.unsuspended'
        and metadata - 'status' = '{}'::jsonb and metadata ->> 'status' = 'active')
    )
  );
