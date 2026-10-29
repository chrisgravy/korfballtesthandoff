import Link from "next/link";
import { Crest } from "@/components/Crest";
import { fmtKickoff, fmtResultType, resultTypeColor } from "@/lib/format";
import type { Match } from "@/lib/types";

interface ClubMatchCardProps {
  match: Match;
}

export function ClubMatchCard({ match }: ClubMatchCardProps) {
  const finished = match.status === "finished";
  const live = match.status === "live";

  return (
    <Link
      href={`/matches/${match.id}`}
      className="rounded-xl border border-line bg-card p-3 hover:bg-muted transition-colors"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Crest team={match.home} size={20} />
          <span className="font-bold text-ink truncate text-sm">
            {match.home.name}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1 whitespace-nowrap">
          <span className="text-xl font-black tabular-nums">
            {match.homeGoals ?? "–"}
          </span>
          <span className="text-xs font-bold uppercase tracking-tight text-muted">
            {finished ? "Final" : live ? "Live" : fmtKickoff(match.kickoff)}
          </span>
          <span className="text-xl font-black tabular-nums">
            {match.awayGoals ?? "–"}
          </span>
        </div>

        <div className="flex items-center gap-3 min-w-0 justify-end">
          <span className="font-bold text-ink truncate text-right text-sm">
            {match.away.name}
          </span>
          <Crest team={match.away} size={20} />
        </div>
      </div>

      {match.division && (
        <div className="mt-1 flex items-center justify-between text-xs text-muted">
          <span>{match.division.name}</span>
          {finished && match.result_type && (
            <span className={`font-semibold ${resultTypeColor(match.result_type)}`}>
              {fmtResultType(match.result_type)}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
