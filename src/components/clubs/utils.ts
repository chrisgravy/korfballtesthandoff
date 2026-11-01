import type { Division, Team } from "@/lib/types";

/** The divisions this club has teams in, top division first. */
export function clubDivisions(teams: Team[], divisions: Division[]): Division[] {
  const ids = new Set(teams.map((t) => t.division_id));
  return divisions.filter((d) => ids.has(d.id)).sort((a, b) => a.level - b.level);
}

/** The club's teams, top division first, then by name. */
export function sortTeams(teams: Team[], divisions: Division[]): Team[] {
  const level = new Map(divisions.map((d) => [d.id, d.level]));
  return [...teams].sort(
    (a, b) => (level.get(a.division_id) ?? 99) - (level.get(b.division_id) ?? 99) || a.name.localeCompare(b.name)
  );
}

/** Deal items out alternately into two columns: 1st left, 2nd right, 3rd left... */
export function splitInTwo<T>(items: T[]): [T[], T[]] {
  return [items.filter((_, i) => i % 2 === 0), items.filter((_, i) => i % 2 === 1)];
}

/**
 * Round label. Rounds 16 and 17 are the finals: "SF" / "GF" (or "Semi Final" / "Grand Final" when long).
 * Everything else is "Rd 14" (or "Round 14" when long).
 */
export function fmtRound(round: number, long = false): string {
  if (round === 16) return long ? "Semi Final" : "SF";
  if (round === 17) return long ? "Grand Final" : "GF";
  return long ? `Round ${round}` : `Rd ${round}`;
}
