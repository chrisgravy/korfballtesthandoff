#!/usr/bin/env python3
"""
Korfball SA Data Importer
Imports clubs, teams, matches, and players from CSV files into the new Korfball schema.
Run this against a NEW, empty Supabase project.
"""

import csv
import os
import re
import sys
from datetime import datetime
from typing import Dict, List, Optional

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env")
    sys.exit(1)

# Ensure we're using the session pooler (port 5432, no sslmode)
if "sslmode=" in DATABASE_URL:
    print("WARNING: DATABASE_URL contains sslmode, removing for session pooler")
    DATABASE_URL = DATABASE_URL.split("?")[0]

def get_connection():
    """Create a database connection."""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

# The WordPress export contains finals placeholders — "1st", "4th",
# "Winner Final 1" — for brackets that have not been decided yet. They are not
# real teams or clubs, so they are skipped as both teams and fixtures.
PLACEHOLDER_TEAM_RE = re.compile(r"^(?:[1-9](?:st|nd|rd|th)|winner\b.*)$", re.IGNORECASE)

def is_placeholder_team(name: str) -> bool:
    """True for bracket positions like '1st' or 'Winner Final 2'."""
    return bool(PLACEHOLDER_TEAM_RE.match(name.strip()))

# Everything 0002_korfball_schema.sql creates. Dropped before every migrate/import
# so the script can be re-run against a database that already has the schema.
DROP_SCHEMA_SQL = """
DROP TABLE IF EXISTS match_events, player_stats, matches, players, teams, divisions, seasons, clubs CASCADE;
DROP VIEW IF EXISTS division_standings;
"""

def clear_tables(conn):
    """Drop all tables and views."""
    print("Dropping existing tables...")
    with conn.cursor() as cur:
        cur.execute(DROP_SCHEMA_SQL)
    conn.commit()
    print("  Done.")

def run_migration(conn):
    """Run the korfball schema migration.

    The migration SQL is plain `create table` (it assumes a fresh project), so we
    drop the korfball objects in the same transaction first. Without this, a
    re-run on a database that already has the schema fails with
    'relation "clubs" already exists'.
    """
    print("Running migration...")
    with open("supabase/migrations/0002_korfball_schema.sql", "r") as f:
        sql = f.read()

    with conn.cursor() as cur:
        cur.execute(DROP_SCHEMA_SQL)
        cur.execute(sql)
    conn.commit()
    print("Migration complete.")

def import_clubs(conn) -> Dict[str, int]:
    """Import clubs, return slug -> id mapping."""
    print("Importing clubs...")
    club_ids = {}
    
    with open("korfball-clubs.csv", "r") as f:
        reader = csv.DictReader(f)
        clubs = list(reader)
    
    with conn.cursor() as cur:
        for club in clubs:
            cur.execute("""
                INSERT INTO clubs (slug, name, short, color, logo_url, founded, coach)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (slug) DO UPDATE SET
                    name = EXCLUDED.name,
                    short = EXCLUDED.short,
                    color = EXCLUDED.color,
                    founded = EXCLUDED.founded,
                    coach = EXCLUDED.coach
                RETURNING id
            """, (
                club['slug'], club['name'], club['short'], 
                club['color'], f"/logos/{club['slug']}.png",
                club.get('founded') or None, club.get('coach') or None
            ))
            club_ids[club['slug']] = cur.fetchone()['id']
    
    conn.commit()
    print(f"  Imported {len(club_ids)} clubs")
    return club_ids

def import_seasons(conn) -> Dict[str, int]:
    """Import seasons, return season_name -> id mapping."""
    print("Importing seasons...")
    season_ids = {}
    
    # Get unique seasons from matches
    seasons = set()
    with open("korfball-matches.csv", "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            seasons.add(row['season'])
    
    with conn.cursor() as cur:
        for i, season_name in enumerate(sorted(seasons), 1):
            is_current = (season_name == "2026")
            cur.execute("""
                INSERT INTO seasons (id, name, is_current)
                VALUES (%s, %s, %s)
                ON CONFLICT (name) DO UPDATE SET is_current = EXCLUDED.is_current
                RETURNING id
            """, (i, season_name, is_current))
            season_ids[season_name] = cur.fetchone()['id']
    
    conn.commit()
    print(f"  Imported {len(season_ids)} seasons")
    return season_ids

def import_divisions(conn, season_ids: Dict[str, int]) -> Dict[tuple, int]:
    """Import divisions, return (season_id, level) -> division_id mapping."""
    print("Importing divisions...")
    div_ids = {}
    
    # Get unique (season, division) pairs from matches
    div_pairs = set()
    with open("korfball-matches.csv", "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            div_pairs.add((row['season'], int(row['division'])))
    
    with conn.cursor() as cur:
        for season_name, level in sorted(div_pairs, key=lambda x: (x[0], x[1])):
            season_id = season_ids[season_name]
            div_name = f"Division {level}" if level <= 3 else "Social League"
            
            cur.execute("""
                INSERT INTO divisions (season_id, name, level)
                VALUES (%s, %s, %s)
                ON CONFLICT (season_id, level) DO UPDATE SET name = EXCLUDED.name
                RETURNING id
            """, (season_id, div_name, level))
            div_ids[(season_id, level)] = cur.fetchone()['id']
    
    conn.commit()
    print(f"  Imported {len(div_ids)} divisions")
    return div_ids

def import_teams(conn, club_ids: Dict[str, int], season_ids: Dict[str, int], div_ids: Dict[tuple, int]) -> Dict[str, int]:
    """Import teams, return team_slug -> id mapping."""
    print("Importing teams...")
    team_ids = {}
    
    with open("korfball-teams.csv", "r") as f:
        reader = csv.DictReader(f)
        all_teams = list(reader)

    # Skip finals placeholders; they are not teams.
    teams = [t for t in all_teams if not is_placeholder_team(t['name'])]
    skipped = len(all_teams) - len(teams)
    
    with conn.cursor() as cur:
        for team in teams:
            club_id = club_ids[team['club_slug']]
            season_id = season_ids[team['season']]
            level = int(team['division'])
            division_id = div_ids[(season_id, level)]
            
            cur.execute("""
                INSERT INTO teams (club_id, division_id, slug, name, short, color)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (slug) DO UPDATE SET
                    club_id = EXCLUDED.club_id,
                    division_id = EXCLUDED.division_id,
                    name = EXCLUDED.name,
                    short = EXCLUDED.short,
                    color = EXCLUDED.color
                RETURNING id
            """, (
                club_id, division_id, team['slug'], 
                team['name'], team['short'], 
                club_ids[team['club_slug']]
            ))
            team_ids[team['slug']] = cur.fetchone()['id']
    
    # Update team colors from their clubs
    with conn.cursor() as cur:
        for team in teams:
            club_id = club_ids[team['club_slug']]
            cur.execute("SELECT color FROM clubs WHERE id = %s", (club_id,))
            club_color = cur.fetchone()['color']
            cur.execute("UPDATE teams SET color = %s WHERE slug = %s", (club_color, team['slug']))
    
    conn.commit()
    print(f"  Imported {len(team_ids)} teams ({skipped} finals placeholders skipped)")
    return team_ids

def import_matches(conn, season_ids: Dict[str, int], div_ids: Dict[tuple, int], team_ids: Dict[str, int]):
    """Import matches."""
    print("Importing matches...")
    
    with open("korfball-matches.csv", "r") as f:
        reader = csv.DictReader(f)
        matches = list(reader)
    
    # Group by (season, division) and renumber matchweeks sequentially by date
    # to avoid duplicates from WordPress data
    from collections import defaultdict
    grouped = defaultdict(list)
    for m in matches:
        key = (m['season'], m['division'])
        grouped[key].append(m)
    
    # Renumber matchweeks within each group by date
    matchweek_map = {}
    for (season, div), group_matches in grouped.items():
        group_matches.sort(key=lambda x: (x['date'], x['home_team']))
        # Assign sequential matchweek numbers
        current_week = 0
        last_date = None
        for m in group_matches:
            if m['date'] != last_date:
                current_week += 1
                last_date = m['date']
            matchweek_map[(m['home_team'], m['away_team'], m['date'])] = current_week
    
    inserted = 0
    unplayed = 0
    placeholder_fixtures = 0
    with conn.cursor() as cur:
        for i, match in enumerate(matches, 1):
            if is_placeholder_team(match['home_team']) or is_placeholder_team(match['away_team']):
                # "1st v 4th": a bracket placeholder, not a real fixture yet.
                placeholder_fixtures += 1
                continue

            season_id = season_ids[match['season']]
            level = int(match['division'])
            division_id = div_ids[(season_id, level)]
            
            # Use renumbered matchweek
            matchweek = matchweek_map.get((match['home_team'], match['away_team'], match['date']), int(match['matchweek']))
            
            # Get team IDs using the correct slug format
            home_slug = match['home_team'].lower().replace(' ', '-').replace('!', '').replace('&', 'and').replace("'", '')
            away_slug = match['away_team'].lower().replace(' ', '-').replace('!', '').replace('&', 'and').replace("'", '')
            
            # Add season/division suffix to match our team slugs
            if match['season'] == '2025' and level == 1:
                home_slug += '-2025'
                away_slug += '-2025'
            elif match['season'] == '2026' and level == 1:
                home_slug += '-2026'
                away_slug += '-2026'
            elif match['season'] == '2026' and level == 2:
                if home_slug in ['arista', 'boomers', 'flinders', 'north', 'scaldis']:
                    home_slug += '-2026-d2'
                else:
                    home_slug += '-2026'
                if away_slug in ['arista', 'boomers', 'flinders', 'north', 'scaldis']:
                    away_slug += '-2026-d2'
                else:
                    away_slug += '-2026'
            elif match['season'] == '2026' and level == 4:
                home_slug += '-2026'
                away_slug += '-2026'
            
            home_id = team_ids.get(home_slug)
            away_id = team_ids.get(away_slug)
            
            if not home_id or not away_id:
                print(f"  WARNING: Team not found: {home_slug} or {away_slug}")
                continue
            
            # Parse scores. A 0-0 row in this export means the game has not been
            # played yet — a played korfball match never ends 0-0 (the lowest real
            # score in the data is 3) — so store it as an unplayed fixture.
            home_goals = int(match['home_score']) if match['home_score'] else None
            away_goals = int(match['away_score']) if match['away_score'] else None
            if home_goals == 0 and away_goals == 0:
                home_goals = away_goals = None
            gg = int(match['golden_goal']) if match['golden_goal'] else 0
            
            # Determine status and result_type
            if home_goals is not None and away_goals is not None:
                status = 'finished'
                if home_goals > away_goals:
                    result_type = 'gg_win' if gg and home_goals > away_goals else 'win'
                elif away_goals > home_goals:
                    result_type = 'gg_loss' if gg and away_goals > home_goals else 'loss'
                else:
                    result_type = 'draw'
            else:
                status = 'scheduled'
                result_type = None
                unplayed += 1
            
            # Create kickoff timestamp (assume 2pm local if not specified)
            kickoff = f"{match['date']} 14:00:00+10:30"  # Adelaide time
            
            cur.execute("""
                INSERT INTO matches (season_id, division_id, matchweek, kickoff, home_id, away_id,
                    home_goals, away_goals, status, result_type)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (division_id, matchweek, home_id) DO UPDATE SET
                    away_id = EXCLUDED.away_id,
                    kickoff = EXCLUDED.kickoff,
                    home_goals = EXCLUDED.home_goals,
                    away_goals = EXCLUDED.away_goals,
                    status = EXCLUDED.status,
                    result_type = EXCLUDED.result_type
            """, (
                season_id, division_id, matchweek, kickoff,
                home_id, away_id, home_goals, away_goals, status, result_type
            ))
            inserted += 1

    # Mark finals matchweeks (16+) as not counting toward the league table.
    # These are semi-finals and grand finals, not regular-season fixtures.
    with conn.cursor() as cur:
        cur.execute("UPDATE matches SET is_finals = true WHERE matchweek >= 16")

    conn.commit()
    print(f"  Imported {inserted} matches ({unplayed} unplayed, "
          f"{placeholder_fixtures} finals placeholders skipped)")

def import_players(conn, team_ids: Dict[str, int]):
    """Import players."""
    print("Importing players...")
    
    with open("korfball-players.csv", "r") as f:
        reader = csv.DictReader(f)
        players = list(reader)
    
    # Filter out trashed players
    players = [p for p in players if '__trashed' not in p['slug']]
    
    with conn.cursor() as cur:
        for player in players:
            # Map team name to team slug
            team_name = player['team']
            season = player['season']
            div = player['division']
            
            # Build team slug same way as in import_teams
            team_slug = team_name.lower().replace(' ', '-').replace('!', '').replace('&', 'and').replace("'", '')
            if season == '2025' and div == '1':
                team_slug += '-2025'
            elif season == '2026' and div == '1':
                team_slug += '-2026'
            elif season == '2026' and div == '2':
                if team_slug in ['arista', 'boomers', 'flinders', 'north', 'scaldis']:
                    team_slug += '-2026-d2'
                else:
                    team_slug += '-2026'
            elif season == '2026' and div == '4':
                team_slug += '-2026'
            
            team_id = team_ids.get(team_slug)
            if not team_id:
                print(f"  WARNING: Team not found for player {player['name']}: {team_slug}")
                continue
            
            cur.execute("""
                INSERT INTO players (team_id, name, gender, shirt)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (
                team_id, player['name'], 'M', int(player['shirt'])
            ))
    
    conn.commit()
    print(f"  Imported {len(players)} players")

def main():
    import sys
    print("=" * 60)
    print("Korfball SA Data Importer")
    print("=" * 60)
    print(f"Database: {DATABASE_URL[:50]}...")
    print()
    
    # Accept --yes flag to skip confirmation
    if "--yes" not in sys.argv:
        response = input("This will import data into the database. Continue? (yes/no): ")
        if response.lower() != 'yes':
            print("Aborted.")
            return
    
    conn = get_connection()
    try:
        # Clear existing data first
        clear_tables(conn)
        
        # Run migration (safe to re-run with IF NOT EXISTS / ON CONFLICT)
        run_migration(conn)
        
        # Import in dependency order
        club_ids = import_clubs(conn)
        season_ids = import_seasons(conn)
        div_ids = import_divisions(conn, season_ids)
        team_ids = import_teams(conn, club_ids, season_ids, div_ids)
        import_matches(conn, season_ids, div_ids, team_ids)
        import_players(conn, team_ids)
        
        # Update sequences
        print("Updating sequences...")
        with conn.cursor() as cur:
            for table in ['seasons', 'clubs', 'divisions', 'teams', 'players', 'matches']:
                cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), (SELECT MAX(id) FROM {table}))")
        conn.commit()
        
        print("\n" + "=" * 60)
        print("Import complete!")
        print("=" * 60)
        
    except Exception as e:
        conn.rollback()
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    main()