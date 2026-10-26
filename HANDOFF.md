# Handoff: Pitchline → Korfball SA site

Paste or attach this file to the next agent, along with the project folder (zip it WITHOUT `node_modules` and WITHOUT `.env`). Never share the real `.env`; it holds the database password.

## Goal
A stats and live-scores website for **Korfball South Australia** (public site today: https://sa.korfball.org.au/), plus later a phone scorer app that updates the site live, including from stadiums with poor signal.

Current state: a working **sample** site called "Pitchline" (fictional football league, invented clubs and players). Next job: replace the sample with real Korfball SA data and restyle the site, then build the phone app.

The look is original on purpose. It was inspired by the general layout of top football league sites, but no third-party logos, text, images or branding were copied. Keep it that way.

## Stack (all chosen by the user)
Next.js 15 (App Router, server components) · TypeScript · Tailwind CSS 3 · PostgreSQL on **Supabase** · Recharts 2 · `pg` (plain SQL, no ORM) · `@supabase/supabase-js` (live refresh only). Node 20+.

User is on macOS, running `npm run dev` locally (Next 15.5.28). They do not have Docker (not needed). Supabase project is created, `.env` is filled in, `npm run db:seed` succeeded, site runs at http://localhost:3000.

## Project layout
```
supabase/migrations/0001_init.sql   schema, trigger, RLS, realtime (Supabase-only: uses auth.jwt/auth.uid)
db/seed.ts                          DROPS + recreates tables, loads sample season (batched inserts, prints progress)
src/lib/{db,pgconfig,queries,types,format}.ts
src/components/{Header,Crest,FixtureStrip,LeagueTable,charts,LiveRefresh}.tsx
src/app/{page,layout,globals.css}, matches/, table/, stats/, clubs/ + clubs/[slug]/, players/[id]/
docs/scorer-app.md                  untested Expo outbox sketch
.env.example  README.md  next.config.mjs  tailwind.config.ts  package.json
```
Env vars: `DATABASE_URL` (Supabase **Session pooler** string, port 5432, NO `?sslmode=`), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Next only reads `.env` at startup, so restart after edits.

## Database (football-shaped, needs changing for korfball)
- `seasons(id, name, is_current)`
- `teams(id, slug, name, short, color)`
- `players(id, team_id, name, position GK|DEF|MID|FWD, shirt)`
- `matches(id, season_id, matchweek, kickoff, home_id, away_id, home_goals, away_goals, status scheduled|live|finished, minute)`
- `player_stats(player_id, match_id, minutes, goals, assists, shots)` PK (player_id, match_id)
- `match_events(id uuid PK made on the phone, match_id, team_id credited, type goal|own_goal|shot, player_id, assist_player_id, minute, created_at, created_by default auth.uid())`

Key design decisions:
- **Event sourcing for live scoring.** Scorers record events, never totals. Trigger `apply_match_event` (after insert or delete, security definer) updates `matches` scores and `player_stats`. Deleting an event undoes it. Client-generated UUIDs make retried offline uploads idempotent.
- **RLS:** public read on all tables. Only users with `app_metadata.role = 'scorer'` may insert/delete `match_events` and update `matches.status`/`minute` (column-level grant; scores can only change via the trigger).
- **Realtime:** `matches` is in the `supabase_realtime` publication. `LiveRefresh` (mounted in `layout.tsx`) subscribes to UPDATEs and calls `router.refresh()` (debounced 500 ms).
- **Standings are computed in SQL** from finished matches (3 pts win, 1 draw) in `getStandings`; nothing is stored. Live matches show in the fixture strip but not the table.
- Pages are `force-dynamic` and query Postgres directly via a pooled `pg` client. SSL uses `rejectUnauthorized: false` for simplicity (verify Supabase's CA before production).
- Seeded matches have no events; only app-scored matches do.
- `db:seed` drops tables. **Never run it against a database with real data.**

Pages: `/` (hero, latest matchweek strip, table, top scorers) · `/matches?mw=` · `/table` · `/stats` (interactive Recharts leaderboard, filters) · `/clubs`, `/clubs/[slug]` (form chart, squad) · `/players/[id]` (match-by-match chart).

## Problems already solved (don't repeat)
- `DATABASE_URL` with leftover `YOUR_REGION` placeholder → "database ... does not exist".
- Seed looked frozen: original seed did ~1000 single inserts in one transaction and printed nothing until done. Rewritten with batched inserts, progress logs, 15 s connect timeout. Ctrl+C mid-seed rolls everything back, causing `relation "seasons" does not exist`.
- Next.js "multiple lockfiles" warning (stray `package-lock.json` in the user's home folder). Harmless; silence with `outputFileTracingRoot` in `next.config.mjs`.
- The Supabase "Connect" dialog tabs: **Direct** tab gives the connection string, **Framework** tab gives URL + anon key. The `@supabase/ssr`, shadcn and `skills add` commands it suggests are not needed.

## Findings about Korfball SA
- The user also has a local WordPress test site at `http://korfball-sa.local/` (probably Local by Flywheel, folder `Local Sites/korfballtest`). It is **not reachable** from outside their machine; ask for screenshots or exports.
- The public site shows upcoming fixtures, recent results, and standings for **Division 1, 2 and 3** (labelled 2021, so stale: use as a structure guide only). Clubs: North, Arista, Boomers, Flinders, Scaldis; one club fields several teams (Arista 1/2/3, Scaldis Orange/Black 3, etc.). Tables show only W / D / L, so the points system is unknown.

## Next steps
1. **Get inputs from the user:** current-season teams and clubs with division, fixtures (dates, times, venues, results), players (team, gender) if wanted, points system, goal types scorers will record, logo and colours (only if they have rights; otherwise make original crests). A CSV or spreadsheet is easiest; if the data is in WordPress, find out which plugin.
2. **Rework the schema for korfball** (new migration, not edits to the old one): `clubs` table, `teams.club_id`, `divisions` per season (fixtures and tables per division), player gender (teams are 4 women + 4 men), replace GK/DEF/MID/FWD and assists/shots with korfball stats and goal types, match periods and length, points rules in the standings query.
3. **Use a second, empty Supabase project for real data** so `db:seed` can never wipe it. Keep the current project as the test environment. Write an importer (CSV → inserts) that creates no results.
4. **Redesign** the site's look and feel for Korfball SA (colours, type, copy, crests); update `FixtureStrip`, `LeagueTable`, charts and pages for divisions/clubs.
5. **Verify the live pipeline.** The user has not yet run the SQL test: set a match `live` and insert a `match_events` goal in the SQL editor, confirm the site updates without a reload, then undo. Test SQL is in the earlier conversation; rewrite it for the new schema.
6. **Build the Expo scorer app:** Supabase Auth sign-in for scorer accounts (`app_metadata.role = 'scorer'`), match picker, goal buttons, undo, SQLite outbox with an "events waiting to upload" badge. See `docs/scorer-app.md`. PowerSync is an option for the sync layer. Never ship the service-role key in the app.

## Caveats
- Everything was typechecked (`tsc --noEmit`) and the migration SQL syntax-checked, but only the seed and basic site have been run against real Supabase by the user. The trigger, RLS, live refresh and scorer snippet are untested in production.
- Sample data is all invented; do not present it as real.
