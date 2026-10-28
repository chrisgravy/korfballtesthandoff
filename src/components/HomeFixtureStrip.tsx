import Link from "next/link";
import { Crest } from "./Crest";
import { fmtKickoff } from "@/lib/format";
import type { Match } from "@/lib/types";

function roundLabel(round: number): string {
  if (round === 16) return "Semi-Final";
  if (round === 17) return "Grand Final";
  return `Round ${round}`;
}

export function HomeFixtureStrip({ matches }: { matches: Match[] }) {
  const matchesByRound = new Map<number, Match[]>();
  matches.forEach((m) => {
    if (!matchesByRound.has(m.matchweek)) {
      matchesByRound.set(m.matchweek, []);
    }
    matchesByRound.get(m.matchweek)!.push(m);
  });

  return (
    <div className="flex flex-col gap-6">
      {Array.from(matchesByRound.entries()).map(([matchweek, roundMatches]) => (
        <div key={matchweek.toString()} className="mb-6">
          <h2 className="text-xl font-black mb-3">{roundLabel(matchweek)}</h2>
          <div className="space-y-3">
            {roundMatches.map((m) => (
              <Link key={m.id} href={`/matches/${m.id}`} className="block">
                <div className="rounded-xl border border-line bg-card p-3 hover:bg-muted transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Crest team={m.home} size={28} />
                      <span className="font-bold text-ink truncate">{m.home.name}</span>
                    </div>

                    <div className="flex flex-col items-center gap-1 whitespace-nowrap">
                      <span className="text-xl font-black tabular-nums">{m.homeGoals ?? "–"}</span>
                      <span className="text-xs font-bold uppercase tracking-tight text-mute">
                        {m.status === "finished" ? "FINAL" : m.status === "live" ? "LIVE" : fmtKickoff(m.kickoff)}
                      </span>
                      <span className="text-xl font-black tabular-nums">{m.awayGoals ?? "–"}</span>
                    </div>

                    <div className="flex items-center gap-2 min-w-0 justify-end">
                      <span className="font-bold text-ink truncate text-right">{m.away.name}</span>
                      <Crest team={m.away} size={28} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}