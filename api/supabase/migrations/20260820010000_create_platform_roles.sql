create table public.platform_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  role varchar(30) not null,
  created_at timestamp not null default current_timestamp,
  created_by uuid references public.users(id) on delete restrict,
  revoked_at timestamp,
  revoked_by uuid references public.users(id) on delete restrict,
  constraint platform_roles_role_check check (role in ('super_admin')),
  constraint platform_roles_revocation_check check (
    (revoked_at is null and revoked_by is null)
    or (revoked_at is not null and revoked_by is not null)
  )
);

create unique index platform_roles_active_user_role_unique
  on public.platform_roles (user_id, role)
  where revoked_at is null;

create index platform_roles_active_role_lookup
  on public.platform_roles (role, user_id)
  where revoked_at is null;

create function public.protect_last_super_admin() returns trigger
language plpgsql as $$
declare
  removes_active_super_admin boolean := false;
begin
  if old.role = 'super_admin' and old.revoked_at is null then
    if tg_op = 'DELETE' then
      removes_active_super_admin := true;
    elsif tg_op = 'UPDATE' then
      removes_active_super_admin := new.revoked_at is not null
        or new.role <> 'super_admin';
    end if;
  end if;

  if removes_active_super_admin then
    perform pg_advisory_xact_lock(hashtext('platform_roles:last_super_admin'));

    if not exists (
      select 1
      from public.platform_roles
      where role = 'super_admin'
        and revoked_at is null
        and id <> old.id
    ) then
      raise exception 'platform must retain at least one active super admin'
        using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger platform_roles_protect_last_super_admin
  before update or delete on public.platform_roles
  for each row execute function public.protect_last_super_admin();

alter table public.platform_roles enable row level security;
