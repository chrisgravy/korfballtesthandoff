 import { pool } from "./db";

export interface RoundTeam { name: string; short: string; color: string; logoUrl: string | null }
export interface RoundMatch {
  id: number;
  kickoff: string; // ISO
  status: "live" | "finished";
  period: number | null;
  goldenGoal: boolean;
  homeGoals: number;
  awayGoals: number;
  home: RoundTeam;
  away: RoundTeam;
}
export interface RoundDivision { name: string; level: number; date: string; matches: RoundMatch[] }
export interface RoundGroup { round: number; divisions: RoundDivision[] }

type Row = {
  id: number; round: number; kickoff: Date; status: "live" | "finished"; period: number | null;
  result_type: string | null; home_goals: number; away_goals: number;
  division_name: string; division_level: number;
  home_name: string; home_short: string; home_color: string; home_logo: string | null;
  away_name: string; away_short: string; away_color: string; away_logo: string | null;
};

// Played and live matches in Divisions 1 and 2 for the latest `rounds` round numbers, newest round first.
export async function getRoundResults(rounds = 8): Promise<RoundGroup[]> {
  const { rows } = await pool.query<Row>(
    `WITH played AS (
       SELECT m.*, d.name AS division_name, d.level AS division_level
       FROM matches m
       JOIN divisions d ON d.id = m.division_id
       JOIN seasons s ON s.id = m.season_id
       WHERE s.is_current AND d.level IN (1, 2) AND m.status IN ('live', 'finished')
         AND m.home_goals IS NOT NULL AND m.away_goals IS NOT NULL
     ), latest AS (
       SELECT DISTINCT round FROM played ORDER BY round DESC LIMIT $1
     )
     SELECT p.id, p.round, p.kickoff, p.status, p.period, p.result_type, p.home_goals, p.away_goals,
            p.division_name, p.division_level,
            h.name AS home_name, hc.short AS home_short, hc.color AS home_color, hc.logo_url AS home_logo,
            a.name AS away_name, ac.short AS away_short, ac.color AS away_color, ac.logo_url AS away_logo
     FROM played p
     JOIN latest l ON l.round = p.round
     JOIN teams h ON h.id = p.home_id JOIN clubs hc ON hc.id = h.club_id
     JOIN teams a ON a.id = p.away_id JOIN clubs ac ON ac.id = a.club_id
     ORDER BY p.round DESC, p.division_level, p.kickoff, p.id`,
    [rounds],
  );

  const groups: RoundGroup[] = [];
  for (const r of rows) {
    let group = groups.find((g) => g.round === r.round);
    if (!group) groups.push((group = { round: r.round, divisions: [] }));
    let division = group.divisions.find((d) => d.level === r.division_level);
    if (!division) group.divisions.push((division = { name: r.division_name, level: r.division_level, date: r.kickoff.toISOString(), matches: [] }));
    division.matches.push({
      id: r.id, kickoff: r.kickoff.toISOString(), status: r.status, period: r.period,
      goldenGoal: r.result_type === "gg_win" || r.result_type === "gg_loss",
      homeGoals: r.home_goals, awayGoals: r.away_goals,
      home: { name: r.home_name, short: r.home_short, color: r.home_color, logoUrl: r.home_logo },
      away: { name: r.away_name, short: r.away_short, color: r.away_color, logoUrl: r.away_logo },
    });
  }
  return groups;
}

// "Sun 20 Sep" in Adelaide time, spelled the same way on every device.
export function formatRoundDate(iso: string): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Adelaide", year: "numeric", month: "numeric", day: "numeric" })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  const weekday = new Date(Date.UTC(+p.year, +p.month - 1, +p.day)).getUTCDay();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[weekday]} ${p.day} ${months[+p.month - 1]}`;
}