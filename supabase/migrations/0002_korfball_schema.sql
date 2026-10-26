-- Korfball SA schema migration
-- This replaces the football schema with korfball-specific tables and rules.
-- Run this in a NEW, empty Supabase project for real data.

-- ============================================================
-- CORE TABLES
-- ============================================================

create table clubs (
  id serial primary key,
  slug text not null unique,
  name text not null,
  short text not null,
  color text not null,           -- primary brand color (hex)
  logo_url text,                 -- optional: club crest/logo
  founded text,                  -- year founded
  coach text,                    -- head coach name
  created_at timestamptz not null default now()
);

create table seasons (
  id serial primary key,
  name text not null unique,     -- e.g., "2024 Winter", "2025 Summer"
  is_current boolean not null default false,
  starts_on date,                -- optional: season start date
  ends_on date                   -- optional: season end date
);

create table divisions (
  id serial primary key,
  season_id int not null references seasons(id) on delete cascade,
  name text not null,            -- e.g., "Division 1", "Division 2", "Division 3"
  level int not null,            -- 1 = top division, 2 = second, etc.
  unique (season_id, level)
);

create table teams (
  id serial primary key,
  club_id int not null references clubs(id) on delete restrict,
  division_id int not null references divisions(id) on delete restrict,
  slug text not null unique,     -- e.g., "arista-1", "scaldis-orange"
  name text not null,            -- e.g., "Arista 1", "Scaldis Orange"
  short text not null,           -- e.g., "ARI1", "SCO"
  color text not null,           -- team color (can inherit from club or differ)
  created_at timestamptz not null default now()
);

-- Players: korfball teams field 4 women + 4 men
create table players (
  id serial primary key,
  team_id int not null references teams(id) on delete cascade,
  name text not null,
  gender text not null check (gender in ('M','F')),  -- M = male, F = female
  shirt int not null,
  created_at timestamptz not null default now()
);

-- Matches: 4 quarters × 10 min + optional 10 min golden goal
create table matches (
  id serial primary key,
  season_id int not null references seasons(id) on delete cascade,
  division_id int not null references divisions(id) on delete restrict,
  matchweek int not null,
  kickoff timestamptz not null,
  home_id int not null references teams(id) on delete restrict,
  away_id int not null references teams(id) on delete restrict,
  -- Quarter scores (10 min each)
  home_q1 int, away_q1 int,
  home_q2 int, away_q2 int,
  home_q3 int, away_q3 int,
  home_q4 int, away_q4 int,
  -- Golden goal period (10 min, sudden death) - only populated if match goes to GG
  home_gg int, away_gg int,
  -- Final totals (computed by trigger from events)
  home_goals int, away_goals int,
  -- Match status
  status text not null default 'scheduled' check (status in ('scheduled','live','finished')),
  -- Current period: 1-4 for quarters, 5 for golden goal
  period int check (period between 1 and 5),
  -- Minutes elapsed in current period (0-10)
  minute int check (minute between 0 and 10),
  -- Result type for points calculation
  result_type text check (result_type in ('win','gg_win','gg_loss','draw','loss')),
  -- Finals matches (semi/grand final) are excluded from the league table
  is_finals boolean not null default false,
  check (home_id <> away_id),
  unique (division_id, matchweek, home_id),  -- one home match per team per week per division
  unique (division_id, matchweek, away_id)   -- one away match per team per week per division
);

-- Player stats per match (aggregated from events)
create table player_stats (
  player_id int not null references players(id) on delete cascade,
  match_id int not null references matches(id) on delete cascade,
  minutes int not null default 0,      -- minutes played (max 40 + 10 GG)
  goals int not null default 0,        -- regular goals scored
  assists int not null default 0,      -- assists (feed for a goal)
  rebounds int not null default 0,     -- defensive rebounds
  steals int not null default 0,       -- steals / interceptions
  turnovers int not null default 0,    -- turnovers
  penalties int not null default 0,    -- penalties conceded
  primary key (player_id, match_id)
);

-- Event sourcing for live scoring (same pattern as football, but korfball event types)
-- One row per thing that happened. Client-generated UUID = idempotent retries.
create table match_events (
  id uuid primary key,
  match_id int not null references matches(id) on delete cascade,
  team_id int not null references teams(id) on delete restrict,  -- team credited
  type text not null check (type in (
    'goal',           -- regular goal during quarters 1-4
    'golden_goal',    -- goal during golden goal period (ends match)
    'assist',         -- assist for a goal
    'rebound',        -- defensive rebound
    'steal',          -- steal / interception
    'turnover',       -- turnover
    'penalty'         -- penalty conceded
  )),
  player_id int not null references players(id) on delete restrict,  -- player who scored/committed
  assist_player_id int references players(id) on delete set null,    -- for assists
  period int not null check (period between 1 and 5),  -- 1-4 = quarters, 5 = golden goal
  minute int not null check (minute between 0 and 10), -- minute within period
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index on divisions (season_id);
create index on teams (club_id);
create index on teams (division_id);
create index on players (team_id);
create index on matches (season_id, division_id, matchweek);
create index on matches (division_id, matchweek);
create index on player_stats (match_id);
create index on match_events (match_id, period, minute);

-- ============================================================
-- TRIGGER: Apply match events to scores & player stats
-- ============================================================

create or replace function apply_match_event() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  e match_events;
  s int;  -- +1 for insert, -1 for delete
begin
  if tg_op = 'INSERT' then e := new; s := 1; else e := old; s := -1; end if;

  -- Update match quarter/gg scores and totals
  if e.type in ('goal', 'golden_goal') then
    -- Determine which quarter/period column to update
    case e.period
      when 1 then
        update matches set
          home_q1 = coalesce(home_q1, 0) + case when home_id = e.team_id then s else 0 end,
          away_q1 = coalesce(away_q1, 0) + case when away_id = e.team_id then s else 0 end,
          home_goals = coalesce(home_goals, 0) + case when home_id = e.team_id then s else 0 end,
          away_goals = coalesce(away_goals, 0) + case when away_id = e.team_id then s else 0 end
        where id = e.match_id;
      when 2 then
        update matches set
          home_q2 = coalesce(home_q2, 0) + case when home_id = e.team_id then s else 0 end,
          away_q2 = coalesce(away_q2, 0) + case when away_id = e.team_id then s else 0 end,
          home_goals = coalesce(home_goals, 0) + case when home_id = e.team_id then s else 0 end,
          away_goals = coalesce(away_goals, 0) + case when away_id = e.team_id then s else 0 end
        where id = e.match_id;
      when 3 then
        update matches set
          home_q3 = coalesce(home_q3, 0) + case when home_id = e.team_id then s else 0 end,
          away_q3 = coalesce(away_q3, 0) + case when away_id = e.team_id then s else 0 end,
          home_goals = coalesce(home_goals, 0) + case when home_id = e.team_id then s else 0 end,
          away_goals = coalesce(away_goals, 0) + case when away_id = e.team_id then s else 0 end
        where id = e.match_id;
      when 4 then
        update matches set
          home_q4 = coalesce(home_q4, 0) + case when home_id = e.team_id then s else 0 end,
          away_q4 = coalesce(away_q4, 0) + case when away_id = e.team_id then s else 0 end,
          home_goals = coalesce(home_goals, 0) + case when home_id = e.team_id then s else 0 end,
          away_goals = coalesce(away_goals, 0) + case when away_id = e.team_id then s else 0 end
        where id = e.match_id;
      when 5 then
        update matches set
          home_gg = coalesce(home_gg, 0) + case when home_id = e.team_id then s else 0 end,
          away_gg = coalesce(away_gg, 0) + case when away_id = e.team_id then s else 0 end,
          home_goals = coalesce(home_goals, 0) + case when home_id = e.team_id then s else 0 end,
          away_goals = coalesce(away_goals, 0) + case when away_id = e.team_id then s else 0 end
        where id = e.match_id;
    end case;
  end if;

  -- Update player_stats
  if e.type = 'goal' then
    insert into player_stats (player_id, match_id, goals) values (e.player_id, e.match_id, s)
      on conflict (player_id, match_id) do update set goals = player_stats.goals + s;
  elsif e.type = 'golden_goal' then
    insert into player_stats (player_id, match_id, goals) values (e.player_id, e.match_id, s)
      on conflict (player_id, match_id) do update set goals = player_stats.goals + s;
  elsif e.type = 'assist' then
    insert into player_stats (player_id, match_id, assists) values (e.player_id, e.match_id, s)
      on conflict (player_id, match_id) do update set assists = player_stats.assists + s;
  elsif e.type = 'rebound' then
    insert into player_stats (player_id, match_id, rebounds) values (e.player_id, e.match_id, s)
      on conflict (player_id, match_id) do update set rebounds = player_stats.rebounds + s;
  elsif e.type = 'steal' then
    insert into player_stats (player_id, match_id, steals) values (e.player_id, e.match_id, s)
      on conflict (player_id, match_id) do update set steals = player_stats.steals + s;
  elsif e.type = 'turnover' then
    insert into player_stats (player_id, match_id, turnovers) values (e.player_id, e.match_id, s)
      on conflict (player_id, match_id) do update set turnovers = player_stats.turnovers + s;
  elsif e.type = 'penalty' then
    insert into player_stats (player_id, match_id, penalties) values (e.player_id, e.match_id, s)
      on conflict (player_id, match_id) do update set penalties = player_stats.penalties + s;
  end if;

  return null;
end $$;

create trigger match_events_apply after insert or delete on match_events
  for each row execute function apply_match_event();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

-- Helper: check if current user has scorer role
create or replace function is_scorer() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'scorer'
$$;

-- Enable RLS on all tables
do $$
declare t text;
begin
  foreach t in array array[
    'clubs','seasons','divisions','teams','players',
    'matches','player_stats','match_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

-- Scorers can insert/delete match_events
create policy "scorers add events" on match_events for insert to authenticated with check (is_scorer());
create policy "scorers undo events" on match_events for delete to authenticated using (is_scorer());

-- Scorers can update match status, period, minute, result_type (but NOT scores directly)
create policy "scorers set match state" on matches for update to authenticated using (is_scorer()) with check (is_scorer());
revoke update on public.matches from authenticated;
grant update (status, period, minute, result_type) on public.matches to authenticated;

-- ============================================================
-- REALTIME
-- ============================================================

-- Subscribe to match changes for live updates
alter publication supabase_realtime add table matches;

-- ============================================================
-- STANDINGS VIEW (computed from finished matches)
-- ============================================================

-- Points: Win=3, GG Win=2, GG Loss=1, Draw=1, Loss=0
-- Finals matches (semi/grand final) are excluded from the league table
-- We compute this in a view so it's always consistent
create or replace view division_standings as
with match_results as (
  select
    m.division_id,
    m.home_id as team_id,
    case
      when m.home_goals > m.away_goals and m.result_type = 'win' then 3
      when m.home_goals > m.away_goals and m.result_type = 'gg_win' then 2
      when m.home_goals < m.away_goals and m.result_type = 'gg_loss' then 1
      when m.home_goals = m.away_goals and m.result_type = 'draw' then 1
      else 0
    end as points,
    m.home_goals as gf,
    m.away_goals as ga,
    case when m.home_goals > m.away_goals and m.result_type = 'win' then 1 else 0 end as won,
    case when m.home_goals = m.away_goals and m.result_type = 'draw' then 1 else 0 end as drawn,
    case when m.home_goals > m.away_goals and m.result_type = 'gg_win' then 1 else 0 end as gg_won,
    case when m.home_goals < m.away_goals and m.result_type = 'gg_loss' then 1 else 0 end as gg_lost,
    case when m.home_goals < m.away_goals and m.result_type = 'loss' then 1 else 0 end as lost
  from matches m
  where m.status = 'finished' and not m.is_finals
  union all
  select
    m.division_id,
    m.away_id as team_id,
    case
      when m.away_goals > m.home_goals and m.result_type = 'win' then 3
      when m.away_goals > m.home_goals and m.result_type = 'gg_win' then 2
      when m.away_goals < m.home_goals and m.result_type = 'gg_loss' then 1
      when m.away_goals = m.home_goals and m.result_type = 'draw' then 1
      else 0
    end as points,
    m.away_goals as gf,
    m.home_goals as ga,
    case when m.away_goals > m.home_goals and m.result_type = 'win' then 1 else 0 end as won,
    case when m.away_goals = m.home_goals and m.result_type = 'draw' then 1 else 0 end as drawn,
    case when m.away_goals > m.home_goals and m.result_type = 'gg_win' then 1 else 0 end as gg_won,
    case when m.away_goals < m.home_goals and m.result_type = 'gg_loss' then 1 else 0 end as gg_lost,
    case when m.away_goals > m.home_goals and m.result_type = 'loss' then 1 else 0 end as lost
  from matches m
  where m.status = 'finished' and not m.is_finals
)
select
  d.id as division_id,
  d.season_id,
  d.name as division_name,
  d.level,
  t.id as team_id,
  t.slug,
  t.name,
  t.short,
  t.color,
  c.id as club_id,
  c.name as club_name,
  c.slug as club_slug,
  count(mr.team_id)::int as played,
  sum(mr.won)::int as won,
  sum(mr.drawn)::int as drawn,
  sum(mr.gg_won)::int as gg_won,
  sum(mr.gg_lost)::int as gg_lost,
  sum(mr.lost)::int as lost,
  coalesce(sum(mr.gf), 0)::int as gf,
  coalesce(sum(mr.ga), 0)::int as ga,
  (coalesce(sum(mr.gf), 0) - coalesce(sum(mr.ga), 0))::int as gd,
  sum(mr.points)::int as points
from divisions d
join teams t on t.division_id = d.id
join clubs c on c.id = t.club_id
left join match_results mr on mr.team_id = t.id and mr.division_id = d.id
group by d.id, d.season_id, d.name, d.level, t.id, t.slug, t.name, t.short, t.color, c.id, c.name, c.slug
order by d.level, points desc, gd desc, gf desc, t.name;

-- Grant select on the view
grant select on division_standings to anon, authenticated;