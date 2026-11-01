import Link from "next/link";
import { Crest } from "@/components/Crest";
import { fmtShortDate } from "@/lib/format";
import type { Match } from "@/lib/types";

export type Outcome = "win" | "gg_win" | "gg_loss" | "loss" | "draw";

export const OUTCOME_STYLE: Record<Outcome, { label: string; cls: string }> = {
  win: { label: "W", cls: "bg-green-600 text-white" },
  gg_win: { label: "GG W", cls: "bg-amber-500 text-black" },
  gg_loss: { label: "GG L", cls: "bg-orange-500 text-black" },
  loss: { label: "L", cls: "bg-red-600 text-white" },
  draw: { label: "D", cls: "bg-line text-ink" },
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Adelaide" });

export const isClubHome = (match: Match, clubId: number) => match.home.club?.id === clubId;

/**
 * A finished match's result from one side's point of view.
 * matches.result_type is stored from the HOME team's point of view, so it can't be shown as is for an
 * away side. Like the standings view, this works the outcome out from the goals and only reads the
 * golden goal flag from result_type.
 */
function outcomeAs(match: Match, isHome: boolean): Outcome | null {
  if (match.status !== "finished" || match.homeGoals == null || match.awayGoals == null) return null;
  const gf = isHome ? match.homeGoals : match.awayGoals;
  const ga = isHome ? match.awayGoals : match.homeGoals;
  const gg = match.result_type === "gg_win" || match.result_type === "gg_loss";
  if (gf === ga) return "draw";
  if (gf > ga) return gg ? "gg_win" : "win";
  return gg ? "gg_loss" : "loss";
}

/** The club's result (treats the club as the home side if it is on both sides). */
export const outcomeFor = (match: Match, clubId: number) => outcomeAs(match, isClubHome(match, clubId));

/** One specific team's result, identified by its unique team slug. */
export const outcomeForTeam = (match: Match, teamSlug: string) => outcomeAs(match, match.home.slug === teamSlug);

export function OutcomeChip({ outcome, className = "" }: { outcome: Outcome; className?: string }) {
  const s = OUTCOME_STYLE[outcome];
  return (
    <span
      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-black ${s.cls} ${className}`}
    >
      {s.label}
    </span>
  );
}

/** One match as a flat row: teams and score, then division, date and the club's result. */
export function ClubMatchCard({
  match,
  clubId,
  showDivision = true,
}: {
  match: Match;
  clubId: number;
  /** Set false where the division is already shown, e.g. in a card titled with it. */
  showDivision?: boolean;
}) {
  const finished = match.status === "finished";
  const live = match.status === "live";
  const home = isClubHome(match, clubId);
  const outcome = outcomeFor(match, clubId);

  return (
    <Link href={`/matches/${match.id}`} className="block px-6 py-3 transition-colors hover:bg-bg">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="flex min-w-0 items-center justify-end gap-2 text-right">
          <span className={`truncate text-sm ${home ? "font-black" : "font-semibold"}`}>{match.home.name}</span>
          <Crest team={match.home} size={28} />
        </div>

        <span className="min-w-20 rounded-lg bg-bg px-3 py-1 text-center text-base font-black tabular-nums">
          {finished || live ? `${match.homeGoals ?? "–"} – ${match.awayGoals ?? "–"}` : fmtTime(match.kickoff)}
        </span>

        <div className="flex min-w-0 items-center gap-2">
          <Crest team={match.away} size={28} />
          <span className={`truncate text-sm ${!home ? "font-black" : "font-semibold"}`}>{match.away.name}</span>
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-mute">
        <span>
          {showDivision && match.division?.name ? `${match.division.name} · ` : ""}
          {fmtShortDate(match.kickoff)}
          {live ? " · Live" : ""}
        </span>
        {outcome && <OutcomeChip outcome={outcome} />}
      </div>
    </Link>
  );
}
