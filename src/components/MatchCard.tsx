import Link from "next/link";
import { Crest } from "./Crest";
import type { Match } from "@/lib/types";

export function MatchCard({ match }: { match: Match }) {
  return (
    <Link href={`/matches/${match.id}`} className="block">
      <div className="rounded-xl border border-line bg-card p-3 hover:bg-muted transition-colors">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Crest team={match.home} size={20} />
            <span className="font-bold text-ink truncate">{match.home.name}</span>
          </div>
          <span className="text-xl font-black tabular-nums">{match.homeGoals ?? "–"}</span>
          <div className="flex items-center gap-2 justify-end">
            <Crest team={match.away} size={20} />
            <span className="font-bold text-ink">{match.away.name}</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-mute uppercase">
            {match.status === "finished" ? "Final" : fmtKickoff(match.kickoff)}
          </span>
          <span className="font-bold text-ink tabular-nums">{match.awayGoals ?? "–"}</span>
        </div>
      </div>
    </Link>
  );
}