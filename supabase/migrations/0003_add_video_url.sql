-- Add video_url column to matches for full game replays
alter table matches add column video_url text;

create index on matches (video_url) where video_url is not null;
