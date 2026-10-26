import { Crest } from "./Crest";
import { fmtKickoff } from "@/lib/format";
import type { Match } from "@/lib/types";

export function FixtureStrip({ matches }: { matches: Match[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {matches.map((m) => {
        const started = m.status !== "scheduled";
        const live = m.status === "live";
        const finished = m.status === "finished";
        const wentToGG = finished && (m.home_gg !== null || m.away_gg !== null);
        
        return (
          <div key={m.id} className="w-56 shrink-0 rounded-xl border border-line bg-card p-3">
            <div className="text-xs font-semibold text-mute mb-1">
              {live ? (
                <span className="font-black text-red-600">LIVE Q{m.period} {m.minute ?? ""}'</span>
              ) : finished ? (
                wentToGG ? <span className="font-black text-amber-600">Golden Goal</span> : "Full time"
              ) : (
                fmtKickoff(m.kickoff)
              )}
            </div>
            
            {/* Quarter scores for finished/live matches */}
            {(started || live) && (
              <div className="text-xs text-mute mb-1 font-mono">
                Q1: {m.home_q1 ?? "-"}–{m.away_q1 ?? "-"} 
                Q2: {m.home_q2 ?? "-"}–{m.away_q2 ?? "-"} 
                Q3: {m.home_q3 ?? "-"}–{m.away_q3 ?? "-"} 
                Q4: {m.home_q4 ?? "-"}–{m.away_q4 ?? "-"}
                {wentToGG && <span className="ml-1 text-amber-600"> GG: {m.home_gg ?? "-"}–{m.away_gg ?? "-"}</span>}
              </div>
            )}
            
            {[
              { t: m.home, g: m.homeGoals, q1: m.home_q1, q2: m.home_q2, q3: m.home_q3, q4: m.home_q4, gg: m.home_gg },
              { t: m.away, g: m.awayGoals, q1: m.away_q1, q2: m.away_q2, q3: m.away_q3, q4: m.away_q4, gg: m.away_gg },
            ].map(({ t, g }) => (
              <div key={t.slug} className="mt-1.5 flex items-center gap-2 text-sm font-semibold">
                <Crest team={t} size={22} />
                <span className="truncate">{t.name}</span>
                <b className="ml-auto text-base font-black">{started ? g : ""}</b>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}