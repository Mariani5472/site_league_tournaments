-- Baseline do schema "ligas" para um projeto Supabase vazio.
-- O Supabase registra esta migration em supabase_migrations.schema_migrations.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email varchar(255) not null unique,
  nickname varchar(30) not null unique,
  avatar_url text,
  banner_url text,
  bio text,
  created_at timestamp default current_timestamp
);

create table public.riot_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  game_name varchar(30) not null,
  tag_line varchar(10) not null,
  puuid text unique,
  region varchar(10) not null,
  summoner_level integer,
  profile_icon_id integer,
  verified boolean default false,
  created_at timestamp default current_timestamp,
  linked_at timestamp default current_timestamp
);

create unique index riot_accounts_user_id_unique
  on public.riot_accounts (user_id);

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name varchar(100) not null,
  description text,
  visibility varchar(20) not null constraint leagues_visibility_check check (visibility in ('public', 'private')),
  join_policy varchar(20) not null constraint leagues_join_policy_check check (join_policy in ('open', 'request', 'invite_only')),
  max_players integer not null constraint leagues_max_players_check check (max_players between 2 and 500),
  created_at timestamp default current_timestamp
);

create table public.league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role varchar(20) not null constraint league_members_role_check check (role in ('owner', 'admin', 'player', 'spec')),
  created_at timestamp default current_timestamp,
  constraint unique_user_per_league unique (league_id, user_id)
);

create table public.league_join_requests (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status varchar(20) not null constraint league_requests_status_check check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp default current_timestamp
);

create unique index unique_pending_join_request
  on public.league_join_requests (league_id, user_id)
  where status = 'pending';

create table public.lobbies (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  status varchar not null default 'waiting' constraint lobbies_status_check check (status in ('waiting', 'in_game', 'finished', 'cancelled')),
  max_players integer not null constraint lobbies_max_players_check
    check (max_players between 2 and 10 and max_players % 2 = 0),
  created_by uuid not null references public.users(id),
  created_at timestamp default current_timestamp,
  team_selection_mode varchar(20) constraint lobbies_team_selection_mode_check check (team_selection_mode is null or team_selection_mode in ('random', 'balanced', 'player_picks')),
  team_selection_completed boolean not null default false,
  draft_captain_1 uuid references public.users(id) on delete set null,
  draft_captain_2 uuid references public.users(id) on delete set null,
  draft_pick_index integer not null default 0,
  team_selection_round integer not null default 0,
  captain_vote_ends_at timestamp,
  constraint lobbies_id_league_unique unique (id, league_id)
);

create unique index unique_waiting_lobby_per_league
  on public.lobbies (league_id)
  where status = 'waiting';

create table public.lobby_players (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  team_number integer not null constraint lobby_players_team_check check (team_number in (1, 2)),
  is_ready boolean not null default false,
  constraint unique_user_per_lobby unique (lobby_id, user_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  league_id uuid not null references public.leagues(id) on delete cascade,
  status varchar not null default 'in_game' constraint matches_status_check
    check (status in ('in_game', 'finished', 'cancelled')),
  started_at timestamp,
  finished_at timestamp,
  created_at timestamp default current_timestamp,
  winner_team_number integer constraint matches_winner_team_check check (winner_team_number is null or winner_team_number in (1, 2)),
  resolution_type varchar(20) constraint matches_resolution_type_check check (resolution_type is null or resolution_type in ('vote', 'admin')),
  resolution_reason text,
  resolved_by uuid references public.users(id) on delete set null,
  constraint unique_match_per_lobby unique (lobby_id),
  constraint matches_lobby_league_fk foreign key (lobby_id, league_id)
    references public.lobbies(id, league_id) on delete cascade
);

create index matches_league_id_created_at_index on public.matches (league_id, created_at);

create table public.match_votes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  voter_id uuid not null references public.users(id) on delete cascade,
  winner_team integer not null constraint match_votes_team_check check (winner_team in (1, 2)),
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp,
  constraint unique_vote_per_match unique (match_id, voter_id)
);

create index match_votes_match_id_index on public.match_votes (match_id);

create table public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  team_number integer not null constraint match_players_team_check check (team_number in (1, 2)),
  nickname_snapshot varchar(30),
  result varchar(10) constraint match_players_result_check check (result is null or result in ('win', 'loss')),
  created_at timestamp not null default current_timestamp,
  constraint unique_player_per_match unique (match_id, user_id)
);

create index match_players_user_id_index on public.match_players (user_id);

create table public.lobby_team_selection_votes (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  mode varchar(20) not null constraint lobby_team_selection_votes_mode_check check (mode in ('random', 'balanced', 'player_picks')),
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp,
  constraint unique_team_selection_vote unique (lobby_id, user_id)
);

create table public.lobby_draft_picks (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  team_number integer not null constraint lobby_draft_picks_team_check
    check (team_number in (1, 2)),
  pick_number integer not null,
  created_at timestamp not null default current_timestamp,
  constraint unique_lobby_draft_player unique (lobby_id, user_id),
  constraint unique_lobby_draft_pick unique (lobby_id, pick_number)
);

create table public.lobby_team_confirmation_votes (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  decision varchar(10) not null constraint team_confirmation_decision_check check (decision in ('accept', 'reroll')),
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp,
  constraint unique_team_confirmation_vote unique (lobby_id, user_id)
);

create table public.lobby_captain_votes (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  voter_id uuid not null references public.users(id) on delete cascade,
  candidate_id uuid not null references public.users(id) on delete cascade,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp,
  constraint unique_captain_vote unique (lobby_id, voter_id)
);

create unique index unique_owner_per_league
  on public.league_members (league_id)
  where role = 'owner';

create or replace function public.check_league_owner_consistency(target_league_id uuid)
returns void
language plpgsql
as $$
declare
  canonical_owner_id uuid;
  owner_count integer;
  matching_owner_count integer;
begin
  select owner_id into canonical_owner_id
    from public.leagues where id = target_league_id;
  if not found then return; end if;

  select count(*) filter (where role = 'owner'),
         count(*) filter (where role = 'owner' and user_id = canonical_owner_id)
    into owner_count, matching_owner_count
    from public.league_members where league_id = target_league_id;

  if owner_count <> 1 or matching_owner_count <> 1 then
    raise exception 'league % must have exactly one owner matching leagues.owner_id',
      target_league_id using errcode = '23514';
  end if;
end;
$$;

create or replace function public.enforce_league_owner_from_league()
returns trigger language plpgsql as $$
begin
  perform public.check_league_owner_consistency(new.id);
  return null;
end;
$$;

create or replace function public.enforce_league_owner_from_member()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.league_id is distinct from new.league_id then
    perform public.check_league_owner_consistency(old.league_id);
  end if;
  perform public.check_league_owner_consistency(
    case when tg_op = 'DELETE' then old.league_id else new.league_id end
  );
  return null;
end;
$$;

create constraint trigger enforce_league_owner_on_league
after insert or update of owner_id on public.leagues
deferrable initially deferred for each row
execute function public.enforce_league_owner_from_league();

create constraint trigger enforce_league_owner_on_member
after insert or update or delete on public.league_members
deferrable initially deferred for each row
execute function public.enforce_league_owner_from_member();

-- A aplicação acessa estas tabelas apenas pela API Express. RLS sem policies
-- impede acesso direto pelas chaves anon/authenticated do Supabase.
alter table public.users enable row level security;
alter table public.riot_accounts enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.league_join_requests enable row level security;
alter table public.lobbies enable row level security;
alter table public.lobby_players enable row level security;
alter table public.matches enable row level security;
alter table public.match_votes enable row level security;
alter table public.match_players enable row level security;
alter table public.lobby_team_selection_votes enable row level security;
alter table public.lobby_draft_picks enable row level security;
alter table public.lobby_team_confirmation_votes enable row level security;
alter table public.lobby_captain_votes enable row level security;
