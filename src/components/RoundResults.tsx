import Link from "next/link";
import { Crest } from "./Crest";
import { formatRoundDate, getRoundResults, type RoundMatch } from "@/lib/rounds";

// Rounds 16 and 17 are the finals. They are shown by name instead of "Round 16" / "Round 17".
const FINALS: Record<number, string> = { 16: "Semi Final", 17: "Grand Final" };

function ResultRow({ m }: { m: RoundMatch }) {
  const live = m.status === "live";
  const score = (mine: number, theirs: number) => (mine < theirs ? "text-mute" : "text-ink");
  const label = live ? `LIVE${m.period ? ` Q${m.period}` : ""}` : m.goldenGoal ? "FT · GG" : "FT";
  const labelColour = live ? "text-red-600" : m.goldenGoal ? "text-amber-600" : "text-mute";

  return (
    <li className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-line px-4 py-3 first:border-t-0">
      <div className="flex min-w-0 items-center justify-end gap-2 text-right">
        <span className="truncate text-sm font-semibold" title={m.home.name}>{m.home.name}</span>
        <Crest team={m.home} size={28} />
      </div>
      <div className="flex flex-col items-center">
        <span className="flex gap-1.5 rounded-md bg-bg px-2.5 py-1 text-base font-black tabular-nums">
          <span className={score(m.homeGoals, m.awayGoals)}>{m.homeGoals}</span>
          <span className="text-mute">-</span>
          <span className={score(m.awayGoals, m.homeGoals)}>{m.awayGoals}</span>
        </span>
        <span className={`mt-1 text-[10px] font-extrabold ${labelColour}`}>{label}</span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <Crest team={m.away} size={28} />
        <span className="truncate text-sm font-semibold" title={m.away.name}>{m.away.name}</span>
      </div>
    </li>
  );
}

export async function RoundResults({ rounds = 8 }: { rounds?: number }) {
  const groups = await getRoundResults(rounds);

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card lg:min-h-0" aria-labelledby="round-results-title">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h2 id="round-results-title" className="text-xl font-black tracking-tight">Latest results</h2>
        <Link href="/matches" className="inline-flex items-center gap-1 rounded-full bg-bg px-3 py-1.5 text-xs font-bold hover:underline">
          View all matches <span aria-hidden>›</span>
        </Link>
      </div>

      <div className="relative lg:min-h-0 lg:flex-1">
        <div
          tabIndex={0}
          role="region"
          aria-label="Results grouped by round, scrollable"
          className="max-h-[30rem] overflow-y-auto overscroll-contain border-t border-line [scrollbar-width:thin] lg:absolute lg:inset-0 lg:max-h-none"
        >
          {groups.length === 0 && <p className="px-4 py-8 text-center text-sm text-mute">No results yet this season.</p>}
          {groups.map((g) => (
            <div key={g.round}>
              {/* Stays pinned while that round's games scroll underneath */}
              <h3 className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-card px-4 py-2.5">
                <span className={`text-lg font-black tracking-tight ${FINALS[g.round] ? "rounded-md bg-sig px-2.5 py-0.5 text-black" : ""}`}>
                  {FINALS[g.round] ?? `Round ${g.round}`}
                </span>
              </h3>
              {g.divisions.map((d) => (
                <div key={d.level}>
                  <div className="flex items-center justify-between bg-bg px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-mute">
                    <span>{d.name}</span>
                    <span className="normal-case">{formatRoundDate(d.date)}</span>
                  </div>
                  <ul>{d.matches.map((m) => <ResultRow key={m.id} m={m} />)}</ul>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-3 h-8 bg-gradient-to-t from-card to-transparent" />
      </div>
    </section>
  );
}