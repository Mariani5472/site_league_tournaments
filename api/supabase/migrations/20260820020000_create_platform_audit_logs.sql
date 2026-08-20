create table public.platform_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users(id) on delete restrict,
  action varchar(50) not null,
  target_type varchar(50) not null,
  target_id uuid not null,
  reason varchar(500) not null,
  metadata jsonb not null default '{}'::jsonb,
  correlation_id varchar(100) not null,
  created_at timestamp not null default current_timestamp,
  constraint platform_audit_logs_action_check check (
    action in ('platform_role.granted', 'platform_role.revoked')
  ),
  constraint platform_audit_logs_target_type_check check (target_type in ('user')),
  constraint platform_audit_logs_reason_check check (
    char_length(btrim(reason)) between 10 and 500
  ),
  constraint platform_audit_logs_metadata_check check (
    jsonb_typeof(metadata) = 'object'
    and metadata - 'role' = '{}'::jsonb
    and metadata ? 'role'
    and metadata ->> 'role' in ('super_admin')
  ),
  constraint platform_audit_logs_correlation_check check (
    correlation_id ~ '^[A-Za-z0-9._:-]{1,100}$'
  )
);

create index platform_audit_logs_cursor_index
  on public.platform_audit_logs (created_at, id);
create index platform_audit_logs_actor_index
  on public.platform_audit_logs (actor_id, created_at);
create index platform_audit_logs_target_index
  on public.platform_audit_logs (target_type, target_id, created_at);
create index platform_audit_logs_action_index
  on public.platform_audit_logs (action, created_at);

create function public.protect_platform_audit_logs() returns trigger
language plpgsql as $$
begin
  raise exception 'platform audit logs are append-only'
    using errcode = '23514';
end;
$$;

create trigger platform_audit_logs_append_only
  before update or delete on public.platform_audit_logs
  for each row execute function public.protect_platform_audit_logs();

alter table public.platform_audit_logs enable row level security;
