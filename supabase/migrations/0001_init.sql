-- Pitchline schema for Supabase. Run it in the SQL editor, or let `npm run db:seed` apply it.

create table seasons (
  id serial primary key,
  name text not null unique,
  is_current boolean not null default false
);
create table teams (
  id serial primary key,
  slug text not null unique,
  name text not null,
  short text not null,
  color text not null
);
create table players (
  id serial primary key,
  team_id int not null references teams(id),
  name text not null,
  position text not null check (position in ('GK','DEF','MID','FWD')),
  shirt int not null
);
create table matches (
  id serial primary key,
  season_id int not null references seasons(id),
  matchweek int not null,
  kickoff timestamptz not null,
  home_id int not null references teams(id),
  away_id int not null references teams(id),
  home_goals int,
  away_goals int,
  status text not null default 'scheduled' check (status in ('scheduled','live','finished')),
  minute int,
  check (home_id <> away_id)
);
create table player_stats (
  player_id int not null references players(id),
  match_id int not null references matches(id) on delete cascade,
  minutes int not null default 0,
  goals int not null default 0,
  assists int not null default 0,
  shots int not null default 0,
  primary key (player_id, match_id)
);
-- One row per thing that happened. The id is generated on the scorer's phone, so a
-- retried upload after a dropped connection cannot count the same goal twice.
create table match_events (
  id uuid primary key,
  match_id int not null references matches(id) on delete cascade,
  team_id int not null references teams(id),          -- the team credited with the goal
  type text not null check (type in ('goal','own_goal','shot')),
  player_id int not null references players(id),
  assist_player_id int references players(id),
  minute int not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index on matches (season_id, matchweek);
create index on players (team_id);
create index on player_stats (match_id);
create index on match_events (match_id, minute);

-- Keep scores and player stats in step with the events (inserts add, deletes undo).
create or replace function apply_match_event() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  e match_events;
  s int;
begin
  if tg_op = 'INSERT' then e := new; s := 1; else e := old; s := -1; end if;

  if e.type in ('goal', 'own_goal') then
    update matches set
      home_goals = coalesce(home_goals, 0) + case when home_id = e.team_id then s else 0 end,
      away_goals = coalesce(away_goals, 0) + case when away_id = e.team_id then s else 0 end
    where id = e.match_id;
  end if;

  if e.type = 'goal' then
    insert into player_stats (player_id, match_id, goals, shots) values (e.player_id, e.match_id, s, s)
      on conflict (player_id, match_id) do update
      set goals = player_stats.goals + s, shots = player_stats.shots + s;
    if e.assist_player_id is not null then
      insert into player_stats (player_id, match_id, assists) values (e.assist_player_id, e.match_id, s)
        on conflict (player_id, match_id) do update set assists = player_stats.assists + s;
    end if;
  elsif e.type = 'shot' then
    insert into player_stats (player_id, match_id, shots) values (e.player_id, e.match_id, s)
      on conflict (player_id, match_id) do update set shots = player_stats.shots + s;
  end if;
  return null;
end $$;

create trigger match_events_apply after insert or delete on match_events
  for each row execute function apply_match_event();

-- Everyone can read. Only accounts with app_metadata.role = 'scorer' can write events
-- and change a match's status or clock. Scores are only ever changed by the trigger above.
create or replace function is_scorer() returns boolean
language sql stable as $$ select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'scorer' $$;

do $$
declare t text;
begin
  foreach t in array array['seasons','teams','players','matches','player_stats','match_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

create policy "scorers add events" on match_events for insert to authenticated with check (is_scorer());
create policy "scorers undo events" on match_events for delete to authenticated using (is_scorer());
create policy "scorers set match state" on matches for update to authenticated using (is_scorer()) with check (is_scorer());
revoke update on public.matches from authenticated;
grant update (status, minute) on public.matches to authenticated;

-- Let the website subscribe to match changes.
alter publication supabase_realtime add table matches;
