create table public.league_invitations (
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

create unique index unique_pending_league_invitation
  on public.league_invitations (league_id, recipient_id)
  where status = 'pending';

create index league_invitations_recipient_cursor_idx
  on public.league_invitations (recipient_id, id);

alter table public.league_invitations
  enable row level security;