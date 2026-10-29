import { Crest } from "@/components/Crest";
import { TeamTrendChart } from "@/components/charts";
import { ClubMatchCard } from "./ClubMatchCard";
import type { Club, StandingRow, Match, TrendPoint, Team } from "@/lib/types";

interface ClubOverviewProps {
  club: Club;
  standingPosition: number | null;
  standing: StandingRow | null;
  recentMatches: Match[];
  trend: TrendPoint[];
  div1Team: Team | null;
}

export function ClubOverview({
  club,
  standingPosition,
  standing,
  recentMatches,
  trend,
  div1Team,
}: ClubOverviewProps) {
  const stats = standing
    ? [
        ["Position", standingPosition?.toString() ?? "–"],
        ["Points", standing.points],
        ["Played", standing.played],
        ["Goal difference", standing.gd > 0 ? `+${standing.gd}` : standing.gd],
      ]
    : [];

  return (
    <div className="grid gap-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-card p-4">
            <div className="text-3xl font-black tabular-nums">{value}</div>
            <div className="text-sm text-muted">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent results */}
      <section className="rounded-xl border border-line bg-card p-4">
        <h2 className="border-b border-line px-4 py-3 text-xl font-black">
          Recent Results
        </h2>
        <div className="divide-y divide-line">
          {recentMatches.slice(0, 6).length > 0 ? (
            recentMatches.slice(0, 6).map((m) => (
              <div key={m.id} className="px-4 py-3">
                <ClubMatchCard match={m} />
              </div>
            ))
          ) : (
            <p className="text-center text-muted py-4">No recent results.</p>
          )}
        </div>
      </section>

      {/* Season form */}
      {div1Team && trend.length > 0 && (
        <section className="rounded-xl border border-line bg-card p-4">
          <h2 className="mb-3 text-xl font-black">
            {div1Team.name} · Season Form
          </h2>
          <TeamTrendChart data={trend} color={div1Team.color} />
        </section>
      )}
    </div>
  );
}
