alter table public.leagues
  add column if not exists lobby_creation_policy varchar(20) not null default 'admins',
  add column if not exists auto_start_lobby boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leagues_lobby_creation_policy_check'
      and conrelid = 'public.leagues'::regclass
  ) then
    alter table public.leagues
      add constraint leagues_lobby_creation_policy_check
      check (lobby_creation_policy in ('admins', 'members'));
  end if;
end
$$;
