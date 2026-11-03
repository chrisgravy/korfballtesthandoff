-- Season history: the awards for each division of each season.
-- Recipients are plain names (past seasons often have no player records). Every column is optional:
--   champion          blank = the winner of the Grand Final (round 17), worked out from the matches
--   male_top_scorer   blank = the male player with most goals in player_stats for that division
--   female_top_scorer blank = the female player with most goals in player_stats for that division
create table if not exists division_awards (
  division_id       int primary key references divisions(id) on delete cascade,
  male_mvp          text,
  female_mvp        text,
  best_attacker     text,
  best_defender     text,
  male_top_scorer   text,
  female_top_scorer text,
  champion          text
);

-- Same read-only public access as the other tables
alter table division_awards enable row level security;
drop policy if exists "public read" on division_awards;
create policy "public read" on division_awards for select to anon, authenticated using (true);
