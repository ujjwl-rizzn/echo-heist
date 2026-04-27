-- ECHO HEIST Supabase schema
-- Run in Supabase SQL editor before enabling cloud leaderboard features.

create extension if not exists "pgcrypto";

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  anonymous boolean not null default true,
  display_name text,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  path text not null check (path in ('spy', 'crime')),
  current_level int not null default 1,
  score int not null default 0,
  stealth_rating float not null default 1.0,
  kills int not null default 0,
  alerts_triggered int not null default 0,
  completed boolean not null default false,
  time_ms bigint not null default 0,
  method_signature text not null default 'Ghost',
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists level_records (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references runs(id) on delete cascade,
  level_id int not null,
  path text not null check (path in ('spy', 'crime')),
  score int not null default 0,
  rank char(1) not null default 'D',
  time_ms bigint not null default 0,
  method text not null default 'ghost',
  minigame_attempts int not null default 0,
  items_used jsonb not null default '[]'::jsonb
);

create or replace view leaderboard as
select
  row_number() over (partition by path order by score desc, time_ms asc) as rank,
  coalesce(players.display_name, 'anonymous') as display_name,
  runs.path,
  runs.score,
  runs.stealth_rating,
  runs.time_ms,
  runs.method_signature
from runs
left join players on players.id = runs.player_id
where runs.completed = true;

alter table players enable row level security;
alter table runs enable row level security;
alter table level_records enable row level security;

drop policy if exists "players_public_insert" on players;
drop policy if exists "players_public_update_own" on players;
drop policy if exists "runs_public_insert" on runs;
drop policy if exists "records_public_insert" on level_records;

create policy "players_public_insert"
  on players for insert
  to anon, authenticated
  with check (true);

create policy "players_public_update_own"
  on players for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "runs_public_insert"
  on runs for insert
  to anon, authenticated
  with check (true);

create policy "records_public_insert"
  on level_records for insert
  to anon, authenticated
  with check (true);

grant select on leaderboard to anon, authenticated;
