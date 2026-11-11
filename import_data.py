#!/usr/bin/env python3
"""
Korfball SA incremental data importer.

Safe by default:
  python import_data.py                 # validate and preview; no database writes
  python import_data.py --apply         # apply the import in one transaction

This importer never drops tables, runs migrations, deletes records, or updates
existing matches, match events, player statistics, or player records.
Existing matches are intentionally insert-only: manual edits and scorer-entered
data always take precedence over the CSV export.
"""

from __future__ import annotations

import argparse
import csv
import os
import re
import sys
from collections import defaultdict
from datetime import date, datetime, time
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor

ROOT = Path(__file__).resolve().parent
ADELAIDE = ZoneInfo("Australia/Adelaide")

PLACEHOLDER_TEAM_RE = re.compile(
    r"^(?:[1-9](?:st|nd|rd|th)|winner\b.*)$", re.IGNORECASE
)
GENDERS = {"m": "M", "male": "M", "f": "F", "female": "F"}


def read_csv(filename: str, required: set[str]) -> list[dict[str, str]]:
    path = ROOT / filename
    if not path.exists():
        raise FileNotFoundError(f"Required CSV file not found: {filename}")
    with path.open("r", newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        columns = set(reader.fieldnames or [])
        missing = required - columns
        if missing:
            raise ValueError(
                f"{filename} is missing required column(s): {', '.join(sorted(missing))}"
            )
        return [
            {key: (value or "").strip() for key, value in row.items() if key}
            for row in reader
        ]


def is_placeholder_team(name: str) -> bool:
    return bool(PLACEHOLDER_TEAM_RE.match((name or "").strip()))


def normalise_name(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip()).casefold()


def parse_int(value: str, label: str, *, optional: bool = False) -> int | None:
    if optional and not value:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{label} must be an integer; received {value!r}") from None


def load_source_data() -> dict[str, Any]:
    clubs = read_csv("korfball-clubs.csv", {"slug", "name", "short", "color"})
    teams = read_csv(
        "korfball-teams.csv",
        {"season", "division", "name", "slug", "short", "club_slug"},
    )
    matches = read_csv(
        "korfball-matches.csv",
        {
            "season", "matchweek", "division", "date", "home_team",
            "away_team", "home_score", "away_score", "golden_goal",
        },
    )
    players = read_csv(
        "korfball-players.csv",
        {"season", "division", "team", "name", "shirt", "slug"},
    )
    awards_path = ROOT / "korfball-awards.csv"
    awards = (
        read_csv(
            "korfball-awards.csv",
            {"season", "division", "male_mvp", "female_mvp", "best_attacker",
             "best_defender", "male_top_scorer", "female_top_scorer", "champion"},
        )
        if awards_path.exists()
        else []
    )

    # Use the actual CSV round, with round_override reserved for finals.
    team_lookup: dict[tuple[str, int, str], dict[str, str]] = {}
    for team in teams:
        if is_placeholder_team(team["name"]):
            continue
        division = parse_int(team["division"], f"team {team['slug']} division")
        key = (team["season"], division, normalise_name(team["name"]))
        if key in team_lookup:
            raise ValueError(f"Duplicate team mapping in korfball-teams.csv: {key}")
        team_lookup[key] = team

    seen_team_round: dict[tuple[str, int, int, str], str] = {}
    valid_matches = []
    for row_number, match in enumerate(matches, start=2):
        if is_placeholder_team(match["home_team"]) or is_placeholder_team(match["away_team"]):
            continue
        division = parse_int(match["division"], f"matches CSV line {row_number} division")
        override = match.get("round_override", "")
        round_number = parse_int(
            override or match["matchweek"],
            f"matches CSV line {row_number} round",
        )
        if round_number is None or round_number < 1:
            raise ValueError(f"Invalid round on korfball-matches.csv line {row_number}")
        date.fromisoformat(match["date"])
        for side in ("home_team", "away_team"):
            key = (match["season"], division, normalise_name(match[side]))
            if key not in team_lookup:
                raise ValueError(
                    f"korfball-matches.csv line {row_number}: {match[side]!r} "
                    f"has no matching team in korfball-teams.csv for "
                    f"{match['season']} Division {division}"
                )
            collision_key = (match["season"], division, round_number, normalise_name(match[side]))
            if collision_key in seen_team_round:
                raise ValueError(
                    f"{match[side]} appears twice in {match['season']} Division "
                    f"{division}, round {round_number} "
                    f"({seen_team_round[collision_key]} and {match['date']}). "
                    "Correct matchweek/round_override in the CSV; no rows were imported."
                )
            seen_team_round[collision_key] = match["date"]

        home_score = parse_int(
            match["home_score"], f"matches CSV line {row_number} home_score", optional=True
        )
        away_score = parse_int(
            match["away_score"], f"matches CSV line {row_number} away_score", optional=True
        )
        if (home_score is None) != (away_score is None):
            raise ValueError(
                f"korfball-matches.csv line {row_number}: both scores must be present or blank"
            )
        if home_score == 0 and away_score == 0:
            home_score = away_score = None
        golden_goal = parse_int(
            match.get("golden_goal", "0") or "0",
            f"matches CSV line {row_number} golden_goal",
        )
        if golden_goal not in (0, 1):
            raise ValueError(f"golden_goal must be 0 or 1 on CSV line {row_number}")

        valid_matches.append(
            {
                **match,
                "division_number": division,
                "round_number": round_number,
                "home_score_value": home_score,
                "away_score_value": away_score,
                "golden_goal_value": golden_goal,
            }
        )

    # A missing/invalid gender is not inferred. Those player rows are skipped.
    eligible_players = []
    skipped_players = []
    for player in players:
        if "__trashed" in player.get("slug", ""):
            continue
        gender = GENDERS.get((player.get("gender") or "").strip().lower())
        if not gender:
            skipped_players.append(player)
            continue
        shirt = parse_int(player.get("shirt", ""), f"player {player['name']} shirt")
        eligible_players.append({**player, "gender_value": gender, "shirt_value": shirt})

    return {
        "clubs": clubs,
        "teams": teams,
        "matches": valid_matches,
        "players": eligible_players,
        "skipped_players": skipped_players,
        "awards": awards,
        "team_lookup": team_lookup,
    }


def connect():
    load_dotenv(ROOT / ".env")
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set. Add it to the project .env file.")
    # Keep the supplied connection options intact; do not strip sslmode or print credentials.
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)


def check_schema(conn, *, require_awards: bool = False) -> bool:
    required_columns = {
        "clubs": {"id", "slug", "name", "short", "color", "founded", "coach"},
        "seasons": {"id", "name", "is_current"},
        "divisions": {"id", "season_id", "name", "level"},
        "teams": {"id", "club_id", "division_id", "slug", "name", "short", "color"},
        "players": {"id", "team_id", "name", "gender", "shirt"},
        "matches": {
            "id", "season_id", "division_id", "round", "kickoff", "home_id",
            "away_id", "home_goals", "away_goals", "status", "result_type",
            "video_url",
        },
        "match_events": {"id", "match_id"},
        "player_stats": {"player_id", "match_id"},
    }
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            """
        )
        actual: dict[str, set[str]] = defaultdict(set)
        for row in cur.fetchall():
            actual[row["table_name"]].add(row["column_name"])

    problems = []
    for table, columns in required_columns.items():
        if table not in actual:
            problems.append(f"missing table public.{table}")
            continue
        missing = columns - actual[table]
        if missing:
            problems.append(f"public.{table} missing columns: {', '.join(sorted(missing))}")
    if require_awards and "division_awards" not in actual:
        problems.append("missing table public.division_awards (apply migration 0005 first)")
    if problems:
        raise RuntimeError(
            "Database schema is not ready for this importer:\n  - "
            + "\n  - ".join(problems)
            + "\nApply the repository migrations 0002 through 0005 separately, then retry. "
              "This importer never runs migrations."
        )
    return "division_awards" in actual


def existing_values(conn, table: str, column: str, values: list[str]) -> set[str]:
    if not values:
        return set()
    # Table/column names are internal constants; values remain parameterised.
    with conn.cursor() as cur:
        cur.execute(f"SELECT {column} FROM {table} WHERE {column} = ANY(%s)", (values,))
        return {row[column] for row in cur.fetchall()}


def preview(conn, data: dict[str, Any], awards_available: bool) -> None:
    clubs = data["clubs"]
    seasons = sorted({row["season"] for row in data["matches"]} | {row["season"] for row in data["teams"]})
    teams = [row for row in data["teams"] if not is_placeholder_team(row["name"])]
    existing_clubs = existing_values(conn, "clubs", "slug", [r["slug"] for r in clubs])
    existing_seasons = existing_values(conn, "seasons", "name", seasons)
    existing_teams = existing_values(conn, "teams", "slug", [r["slug"] for r in teams])

    print("\nDRY RUN — no database rows will be changed")
    print("-" * 58)
    print(f"Clubs:    {len(clubs)} source; {len(clubs) - len(existing_clubs)} new; {len(existing_clubs)} already present")
    print(f"Seasons:  {len(seasons)} source; {len(set(seasons) - existing_seasons)} new; {len(existing_seasons)} already present")
    print(f"Teams:    {len(teams)} source; {len(teams) - len(existing_teams)} new; {len(existing_teams)} already present")
    print(f"Matches:  {len(data['matches'])} source fixtures/results; existing matches will be left unchanged")
    print(f"Players:  {len(data['players'])} eligible to add; {len(data['skipped_players'])} skipped (gender missing/invalid)")
    print(f"Awards:   {len(data['awards'])} source rows; {'table available' if awards_available else 'table unavailable — awards will be skipped'}")
    if data["skipped_players"]:
        print("\nPlayers skipped — add a valid M/F gender to korfball-players.csv to import them:")
        for player in data["skipped_players"]:
            print(f"  - {player.get('name', '(unnamed)')} ({player.get('team', 'unknown team')})")
    print("\nNo changes made. Run with --apply only after reviewing this preview.")


def import_clubs(conn, clubs: list[dict[str, str]]) -> dict[str, int]:
    ids = {}
    with conn.cursor() as cur:
        for club in clubs:
            cur.execute(
                """
                INSERT INTO clubs (slug, name, short, color, founded, coach)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (slug) DO UPDATE SET
                    name = EXCLUDED.name,
                    short = EXCLUDED.short,
                    color = EXCLUDED.color,
                    founded = COALESCE(NULLIF(EXCLUDED.founded, ''), clubs.founded),
                    coach = COALESCE(NULLIF(EXCLUDED.coach, ''), clubs.coach)
                RETURNING id
                """,
                (
                    club["slug"], club["name"], club["short"], club["color"],
                    club.get("founded") or None, club.get("coach") or None,
                ),
            )
            ids[club["slug"]] = cur.fetchone()["id"]
    return ids


def import_seasons(conn, data: dict[str, Any]) -> dict[str, int]:
    names = sorted({r["season"] for r in data["matches"]} | {r["season"] for r in data["teams"]})
    current = names[-1] if names else None
    ids = {}
    with conn.cursor() as cur:
        for name in names:
            cur.execute(
                """
                INSERT INTO seasons (name, is_current)
                VALUES (%s, %s)
                ON CONFLICT (name) DO UPDATE SET is_current = EXCLUDED.is_current
                RETURNING id
                """,
                (name, name == current),
            )
            ids[name] = cur.fetchone()["id"]
    return ids


def import_divisions(conn, data: dict[str, Any], season_ids: dict[str, int]) -> dict[tuple[int, int], int]:
    pairs = {
        (season_ids[row["season"]], parse_int(row["division"], "team division"))
        for row in data["teams"]
        if not is_placeholder_team(row["name"])
    }
    pairs |= {
        (season_ids[row["season"]], row["division_number"])
        for row in data["matches"]
    }
    ids = {}
    with conn.cursor() as cur:
        for season_id, level in sorted(pairs):
            name = f"Division {level}" if level <= 3 else "Social League"
            cur.execute(
                """
                INSERT INTO divisions (season_id, name, level)
                VALUES (%s, %s, %s)
                ON CONFLICT (season_id, level) DO UPDATE SET name = EXCLUDED.name
                RETURNING id
                """,
                (season_id, name, level),
            )
            ids[(season_id, level)] = cur.fetchone()["id"]
    return ids


def import_teams(
    conn, data: dict[str, Any], club_ids: dict[str, int],
    season_ids: dict[str, int], division_ids: dict[tuple[int, int], int],
) -> dict[tuple[str, int, str], int]:
    ids = {}
    with conn.cursor() as cur:
        for team in data["teams"]:
            if is_placeholder_team(team["name"]):
                continue
            if team["club_slug"] not in club_ids:
                raise ValueError(f"Unknown club_slug {team['club_slug']!r} for team {team['name']}")
            season_id = season_ids[team["season"]]
            level = parse_int(team["division"], f"team {team['slug']} division")
            division_id = division_ids[(season_id, level)]
            club_id = club_ids[team["club_slug"]]
            cur.execute("SELECT club_id, division_id FROM teams WHERE slug = %s", (team["slug"],))
            existing = cur.fetchone()
            if existing and (
                existing["club_id"] != club_id or existing["division_id"] != division_id
            ):
                raise ValueError(
                    f"Team {team['slug']} already belongs to a different club/division. "
                    "Refusing to move it because existing match and roster relationships may depend on it."
                )
            club_color = next(c["color"] for c in data["clubs"] if c["slug"] == team["club_slug"])
            cur.execute(
                """
                INSERT INTO teams (club_id, division_id, slug, name, short, color)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (slug) DO UPDATE SET
                    name = EXCLUDED.name,
                    short = EXCLUDED.short,
                    color = EXCLUDED.color
                RETURNING id
                """,
                (club_id, division_id, team["slug"], team["name"], team["short"], club_color),
            )
            ids[(team["season"], level, normalise_name(team["name"]))] = cur.fetchone()["id"]
    return ids


def import_matches(
    conn, data: dict[str, Any], season_ids: dict[str, int],
    division_ids: dict[tuple[int, int], int],
    team_ids: dict[tuple[str, int, str], int],
) -> tuple[int, int]:
    inserted = 0
    preserved = 0
    with conn.cursor() as cur:
        for match in data["matches"]:
            season_id = season_ids[match["season"]]
            level = match["division_number"]
            division_id = division_ids[(season_id, level)]
            home_id = team_ids[(match["season"], level, normalise_name(match["home_team"]))]
            away_id = team_ids[(match["season"], level, normalise_name(match["away_team"]))]
            round_number = match["round_number"]

            # Preserve every existing match, even if the CSV has newer values.
            cur.execute(
                """
                SELECT id, home_id, away_id
                FROM matches
                WHERE division_id = %s AND round = %s
                  AND (home_id IN (%s, %s) OR away_id IN (%s, %s))
                """,
                (division_id, round_number, home_id, away_id, home_id, away_id),
            )
            conflicts = cur.fetchall()
            if conflicts:
                exact = any(
                    row["home_id"] == home_id and row["away_id"] == away_id
                    for row in conflicts
                )
                if exact:
                    preserved += 1
                    continue
                raise ValueError(
                    f"Cannot import {match['date']} {match['home_team']} v {match['away_team']}: "
                    f"one of the teams already has a different fixture in round {round_number}. "
                    "Existing match was not changed."
                )

            home_goals = match["home_score_value"]
            away_goals = match["away_score_value"]
            if home_goals is None:
                status = "scheduled"
                result_type = None
            else:
                status = "finished"
                went_to_golden_goal = bool(match["golden_goal_value"])
                if home_goals > away_goals:
                    result_type = "gg_win" if went_to_golden_goal else "win"
                elif home_goals < away_goals:
                    result_type = "gg_loss" if went_to_golden_goal else "loss"
                else:
                    result_type = "draw"

            kickoff_date = date.fromisoformat(match["date"])
            kickoff = datetime.combine(kickoff_date, time(14, 0), tzinfo=ADELAIDE)
            cur.execute(
                """
                INSERT INTO matches (
                    season_id, division_id, round, kickoff, home_id, away_id,
                    home_goals, away_goals, status, result_type
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    season_id, division_id, round_number, kickoff, home_id, away_id,
                    home_goals, away_goals, status, result_type,
                ),
            )
            inserted += 1
    return inserted, preserved


def import_players(conn, data: dict[str, Any], team_ids: dict[tuple[str, int, str], int]) -> tuple[int, int]:
    inserted = 0
    preserved = 0
    with conn.cursor() as cur:
        for player in data["players"]:
            level = parse_int(player["division"], f"player {player['name']} division")
            team_id = team_ids.get((player["season"], level, normalise_name(player["team"])))
            if not team_id:
                print(f"WARNING: no matching team for player {player['name']}; skipped")
                continue
            cur.execute(
                "SELECT id, shirt, gender FROM players WHERE team_id = %s AND lower(name) = lower(%s)",
                (team_id, player["name"]),
            )
            existing = cur.fetchall()
            if existing:
                # Do not modify existing player rows: stats and scorer history reference their IDs.
                preserved += 1
                if len(existing) > 1:
                    print(f"WARNING: multiple existing records for {player['name']}; left all unchanged")
                elif existing[0]["shirt"] != player["shirt_value"] or existing[0]["gender"] != player["gender_value"]:
                    print(f"WARNING: existing player {player['name']} differs from CSV; left unchanged")
                continue
            cur.execute(
                """
                INSERT INTO players (team_id, name, gender, shirt)
                VALUES (%s, %s, %s, %s)
                """,
                (team_id, player["name"], player["gender_value"], player["shirt_value"]),
            )
            inserted += 1
    return inserted, preserved


def import_awards(conn, data: dict[str, Any], season_ids: dict[str, int],
                  division_ids: dict[tuple[int, int], int], available: bool) -> int:
    if not available or not data["awards"]:
        return 0
    fields = [
        "male_mvp", "female_mvp", "best_attacker", "best_defender",
        "male_top_scorer", "female_top_scorer", "champion",
    ]
    count = 0
    with conn.cursor() as cur:
        for row in data["awards"]:
            season_id = season_ids.get(row["season"])
            level = parse_int(row["division"], f"award division", optional=True)
            division_id = division_ids.get((season_id, level)) if season_id and level else None
            if not division_id:
                print(f"WARNING: no matching division for awards row {row['season']} / {row['division']}")
                continue
            values = [row.get(field) or None for field in fields]
            cur.execute(
                f"""
                INSERT INTO division_awards (division_id, {", ".join(fields)})
                VALUES (%s, {", ".join(["%s"] * len(fields))})
                ON CONFLICT (division_id) DO UPDATE SET
                    {", ".join(f"{field} = COALESCE(EXCLUDED.{field}, division_awards.{field})" for field in fields)}
                """,
                [division_id, *values],
            )
            count += 1
    return count


def main() -> int:
    parser = argparse.ArgumentParser(description="Safely synchronise Korfball SA CSV data.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--apply", action="store_true", help="write changes to DATABASE_URL")
    mode.add_argument("--dry-run", action="store_true", help="preview only (the default)")
    args = parser.parse_args()

    try:
        data = load_source_data()
        conn = connect()
        try:
            awards_available = check_schema(conn, require_awards=bool(data["awards"]))
            if not args.apply:
                # The preview path is read-only; it never executes INSERT/UPDATE/DELETE.
                conn.set_session(readonly=True, autocommit=False)
                preview(conn, data, awards_available)
                conn.rollback()
                return 0

            print("APPLY MODE — existing records are preserved; no tables or rows are deleted.")
            print("Match events and player_stats are never written by this importer.")
            try:
                club_ids = import_clubs(conn, data["clubs"])
                season_ids = import_seasons(conn, data)
                division_ids = import_divisions(conn, data, season_ids)
                team_ids = import_teams(conn, data, club_ids, season_ids, division_ids)
                inserted_matches, preserved_matches = import_matches(
                    conn, data, season_ids, division_ids, team_ids
                )
                inserted_players, preserved_players = import_players(conn, data, team_ids)
                awards_count = import_awards(
                    conn, data, season_ids, division_ids, awards_available
                )
                conn.commit()
            except Exception:
                conn.rollback()
                raise

            print("\nImport committed successfully.")
            print(f"Clubs synchronised: {len(club_ids)}")
            print(f"Seasons synchronised: {len(season_ids)}")
            print(f"Teams synchronised: {len(team_ids)}")
            print(f"Matches inserted: {inserted_matches}; existing matches preserved: {preserved_matches}")
            print(f"Players inserted: {inserted_players}; existing players preserved: {preserved_players}")
            print(f"Player rows skipped for missing/invalid gender: {len(data['skipped_players'])}")
            print(f"Award rows processed: {awards_count}")
            print("No match_events or player_stats rows were changed.")
            return 0
        finally:
            conn.close()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
