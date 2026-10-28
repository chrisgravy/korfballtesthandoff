import Link from "next/link";
import { Crest } from "./Crest";
import { fmtKickoff } from "@/lib/format";
import type { Match } from "@/lib/types";

function articleGradient(match: Match): string {
  const gradients = [
    "bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500",
    "bg-gradient-to-br from-blue-500 via-yellow-500 to-red-500",
    "bg-gradient-to-r from-red-500 to-blue-500",
    "bg-gradient-to-b from-yellow-500 to-red-500",
    "bg-gradient-to-tr from-blue-500 to-yellow-500",
    "bg-gradient-to-br from-red-600 via-orange-500 to-blue-600",
  ];
  return gradients[match.id % gradients.length];
}

export function NewsCard({ match }: { match: Match }) {
  return (
    <Link href={`/matches/${match.id}`} className="block">
      <div className="rounded-xl border border-line bg-card p-3 hover:bg-muted transition-colors">
        {!match.home.club?.logo_url && (
          <div className={`mb-3 h-16 rounded-lg ${articleGradient(match)}`} />
        )}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 shrink-0">
            <Crest team={match.home} size={32} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-ink truncate">{match.home.name}</div>
            <span className="text-xs text-mute uppercase">
              {match.status === "finished" ? "Final" : fmtKickoff(match.kickoff)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Crest team={match.away} size={24} />
            <span className="font-bold text-ink">{match.away.name}</span>
          </div>
          <div className="flex-1"></div>
          <span className="font-bold text-ink">{match.awayGoals ?? "–"}</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-2xl font-black tabular-nums">{match.homeGoals ?? "–"}</span>
          <span className="text-xs text-mute">{match.result_type ?? ""}</span>
        </div>
      </div>
    </Link>
  );
}
