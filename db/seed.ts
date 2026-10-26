// Recreates the tables from supabase/migrations/0001_init.sql, then fills them with an invented season.
// Rows are inserted in batches, so it finishes in seconds and prints progress as it goes.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool, type PoolClient } from "pg";
import { poolConfig } from "../src/lib/pgconfig";

type Pos = "GK" | "DEF" | "MID" | "FWD";
type Player = { id: number; pos: Pos };
type Row = (string | number | boolean | null)[];

let seed = 2026;
const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)];
const weighted = <T,>(items: T[], w: (t: T) => number): T => {
  let r = rnd() * items.reduce((sum, t) => sum + w(t), 0);
  for (const t of items) { r -= w(t); if (r <= 0) return t; }
  return items[items.length - 1];
};
const goals = (strength: number) => Math.min(5, Math.floor(rnd() * 2.4 + strength));

// slug, name, short, colour, strength
const TEAMS: [string, string, string, string, number][] = [
  ["harbour-city", "Harbour City", "HAR", "#1f6fb5", 1.1],
  ["ironbridge", "Ironbridge", "IRO", "#8a1f2d", 0.95],
  ["redmoor-united", "Redmoor United", "RED", "#c0392b", 0.7],
  ["kestrel-athletic", "Kestrel Athletic", "KES", "#6b3fa0", 0.45],
  ["vale-town", "Vale Town", "VAL", "#0f8a7a", 0.4],
  ["northgate", "Northgate", "NOR", "#2c3e50", 0.85],
  ["stonebridge", "Stonebridge", "STO", "#b9770e", 0.65],
  ["fenwick-rovers", "Fenwick Rovers", "FEN", "#2e7d32", 0.3],
  ["marlow-park", "Marlow Park", "MAR", "#d35400", 0.6],
  ["coldwater", "Coldwater", "COL", "#34668f", 0.75],
];
const FIRST = ["Mateo", "Jonas", "Idris", "Callum", "Tomás", "Rafe", "Kofi", "Niall", "Elias", "Dario", "Soren", "Amir", "Luca", "Bram", "Yusuf", "Hugo", "Felix", "Ravi", "Anders", "Joel"];
const LAST = ["Okafor", "Lindqvist", "Marsh", "Delacroix", "Whitlock", "Santoro", "Bellamy", "Novak", "Achterberg", "Fairweather", "Castillo", "Haddad", "Pemberton", "Rourke", "Takahashi", "Mbeki", "Strand", "Voss", "Calloway", "Duarte"];
const LAYOUT: Pos[] = ["GK", "GK", "DEF", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "MID", "FWD", "FWD", "FWD", "FWD"];
const PLAYED_WEEKS = 8;

function statRows(matchId: number, squad: Player[], teamGoals: number): Row[] {
  const played = squad
    .map((p, i) => ({ ...p, minutes: p.pos === "GK" ? (i === 0 ? 90 : 0) : rnd() < 0.75 ? (rnd() < 0.3 ? 55 + Math.floor(rnd() * 30) : 90) : 0 }))
    .filter((p) => p.minutes > 0);
  const scored = new Map<number, number>();
  const assisted = new Map<number, number>();
  for (let k = 0; k < teamGoals; k++) {
    const s = weighted(played, (p) => ({ GK: 0, DEF: 1, MID: 3, FWD: 6 })[p.pos]);
    scored.set(s.id, (scored.get(s.id) ?? 0) + 1);
    if (rnd() < 0.7) {
      const a = weighted(played.filter((p) => p.id !== s.id && p.pos !== "GK"), (p) => ({ GK: 0, DEF: 2, MID: 5, FWD: 3 })[p.pos]);
      assisted.set(a.id, (assisted.get(a.id) ?? 0) + 1);
    }
  }
  return played.map((p) => {
    const g = scored.get(p.id) ?? 0;
    const shots = g + Math.floor(rnd() * (({ GK: 0, DEF: 1.5, MID: 2.5, FWD: 4 })[p.pos] + 1));
    return [p.id, matchId, p.minutes, g, assisted.get(p.id) ?? 0, shots];
  });
}

async function insertMany(db: PoolClient, table: string, cols: string[], rows: Row[]) {
  const size = Math.floor(30000 / cols.length); // stay well under Postgres's 65,535 parameter limit
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size);
    const values = chunk
      .map((_, r) => `(${cols.map((__, c) => `$${r * cols.length + c + 1}`).join(",")})`)
      .join(",");
    await db.query(`INSERT INTO ${table} (${cols.join(",")}) VALUES ${values}`, chunk.flat());
  }
  console.log(`  ${table}: ${rows.length} rows`);
}

async function main() {
  console.log("Connecting to the database...");
  const pool = new Pool({ ...poolConfig(), connectionTimeoutMillis: 15000 });
  const db = await pool.connect();
  console.log("Connected. Creating tables...");
  try {
    await db.query("BEGIN");
    await db.query("DROP TABLE IF EXISTS match_events, player_stats, matches, players, teams, seasons CASCADE");
    await db.query(readFileSync(join(process.cwd(), "supabase", "migrations", "0001_init.sql"), "utf8"));

    // Build everything in memory first, with fixed ids, then insert table by table.
    const teamRows: Row[] = [];
    const playerRows: Row[] = [];
    const strength = new Map<number, number>();
    const squads = new Map<number, Player[]>();
    let playerId = 0;
    TEAMS.forEach(([slug, name, short, color, st], i) => {
      const teamId = i + 1;
      teamRows.push([teamId, slug, name, short, color]);
      strength.set(teamId, st);
      squads.set(teamId, LAYOUT.map((pos, k) => {
        playerId++;
        playerRows.push([playerId, teamId, `${pick(FIRST)} ${pick(LAST)}`, pos, k + 1]);
        return { id: playerId, pos };
      }));
    });

    // Round-robin (circle method): 9 rounds, then the same 9 with home and away swapped.
    const t = TEAMS.map((_, i) => i + 1);
    const firstHalf: [number, number][][] = [];
    for (let r = 0; r < 9; r++) {
      firstHalf.push(Array.from({ length: 5 }, (_, i): [number, number] => (r % 2 ? [t[9 - i], t[i]] : [t[i], t[9 - i]])));
      t.splice(1, 0, t.pop()!);
    }
    const rounds = [...firstHalf, ...firstHalf.map((rd) => rd.map(([h, a]): [number, number] => [a, h]))];
    const start = Date.UTC(2026, 7, 15);

    const matchRows: Row[] = [];
    const statsRows: Row[] = [];
    let matchId = 0;
    for (let r = 0; r < rounds.length; r++) {
      const done = r + 1 <= PLAYED_WEEKS;
      for (let i = 0; i < rounds[r].length; i++) {
        const [h, a] = rounds[r][i];
        const kickoff = new Date(start + r * 7 * 864e5);
        kickoff.setUTCHours([12, 15, 15, 15, 17][i], i === 0 ? 30 : 0, 0, 0);
        const hg = done ? goals(strength.get(h)! + 0.25) : null;
        const ag = done ? goals(strength.get(a)! ) : null;
        matchId++;
        matchRows.push([matchId, 1, r + 1, kickoff.toISOString(), h, a, hg, ag, done ? "finished" : "scheduled"]);
        if (done) {
          statsRows.push(...statRows(matchId, squads.get(h)!, hg!), ...statRows(matchId, squads.get(a)!, ag!));
        }
      }
    }

    await insertMany(db, "seasons", ["id", "name", "is_current"], [[1, "2026/27", true]]);
    await insertMany(db, "teams", ["id", "slug", "name", "short", "color"], teamRows);
    await insertMany(db, "players", ["id", "team_id", "name", "position", "shirt"], playerRows);
    await insertMany(db, "matches", ["id", "season_id", "matchweek", "kickoff", "home_id", "away_id", "home_goals", "away_goals", "status"], matchRows);
    await insertMany(db, "player_stats", ["player_id", "match_id", "minutes", "goals", "assists", "shots"], statsRows);

    // We set the ids ourselves, so move each id counter past the highest one used.
    for (const table of ["seasons", "teams", "players", "matches"]) {
      await db.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), (SELECT MAX(id) FROM ${table}))`);
    }
    await db.query("COMMIT");
    console.log(`Seeded ${TEAMS.length} teams, ${matchRows.length} matches (${PLAYED_WEEKS} weeks played).`);
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
