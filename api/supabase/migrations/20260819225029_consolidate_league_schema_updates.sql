-- Alterações de liga posteriores à baseline, consolidadas em uma migration
-- idempotente para tolerar ambientes onde parte do delta já foi aplicada.

alter table public.leagues
  add column if not exists lobby_creation_policy varchar(20) not null default 'admins',
  add column if not exists auto_start_lobby boolean not null default false,
  add column if not exists avatar_url text,
  add column if not exists banner_url text;

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

create table if not exists public.league_invitations (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  recipient_id uuid not null references public.users(id) on delete cascade,
  invited_by uuid not null references public.users(id) on delete cascade,
  status varchar(20) not null default 'pending'
    constraint league_invitations_status_check
    check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp
);

create unique index if not exists unique_pending_league_invitation
  on public.league_invitations (league_id, recipient_id)
  where status = 'pending';

create index if not exists league_invitations_recipient_cursor_idx
  on public.league_invitations (recipient_id, id);

alter table public.league_invitations enable row level security;
