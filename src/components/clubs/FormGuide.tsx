"use client";

import Link from "next/link";
import { useState } from "react";
import { Crest } from "@/components/Crest";
import { fmtShortDate } from "@/lib/format";
import { OUTCOME_STYLE, outcomeForTeam } from "./ClubMatchCard";
import { fmtRound } from "./utils";
import type { Match, TeamRef } from "@/lib/types";

type View = "previous" | "upcoming";

/**
 * Team form for ONE team: a column per match with the round, the opponent, home or away, and either
 * the score (coloured by the team's result) or the date. A toggle switches between the last results
 * and the next fixtures.
 *
 * Choose the team with `team`. `matches` can be any list of matches (for example every match the
 * club has played and still has to play): only the ones this team is in are used, and each result is
 * shown from that team's own point of view.
 *
 *   <FormGuide team={boomersDiv1} matches={allClubMatches} />
 *   <FormGuide team={boomersDiv2} matches={allClubMatches} count={3} label="Division 2" />
 */
export function FormGuide({
  team,
  matches,
  count = 5,
  label,
  logoUrl,
}: {
  team: Pick<TeamRef, "slug" | "name" | "short" | "color">;
  matches: Match[];
  /** How many matches to show per view. */
  count?: number;
  /** Text next to the team crest. Defaults to the team name. */
  label?: string;
  /** The team's crest image, usually its club's logo. */
  logoUrl?: string | null;
}) {
  const mine = matches.filter((m) => m.home.slug === team.slug || m.away.slug === team.slug);
  const byKickoff = (a: Match, b: Match) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime();

  // Last results, oldest first so the newest sits on the right
  const previous = mine
    .filter((m) => m.status === "finished")
    .sort((a, b) => byKickoff(b, a))
    .slice(0, count)
    .reverse();
  // Next fixtures, soonest first
  const upcoming = mine
    .filter((m) => m.status !== "finished")
    .sort(byKickoff)
    .slice(0, count);

  // Start on whichever view has something to show
  const [view, setView] = useState<View>(previous.length === 0 && upcoming.length > 0 ? "upcoming" : "previous");
  const shown = view === "previous" ? previous : upcoming;

  return (
    <section className="overflow-hidden rounded-3xl bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-3 pt-5">
        <h2 className="text-xl font-black tracking-tight">Team Form</h2>
        <div role="group" aria-label="Show previous results or upcoming matches" className="inline-flex rounded-xl bg-line p-1">
          {(["previous", "upcoming"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`rounded-lg px-4 py-1.5 text-sm font-bold capitalize transition-colors ${
                view === v ? "bg-card text-ink shadow-sm" : "text-mute hover:text-ink"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="mb-4 flex items-center gap-3">
          <Crest team={{ ...team, logoUrl }} size={28} />
          <span className="truncate text-base font-bold">{label ?? team.name}</span>
        </div>

        {shown.length === 0 ? (
          <p className="py-4 text-sm text-mute">
            {view === "previous" ? "No results yet this season." : "There aren't any upcoming games."}
          </p>
        ) : (
          <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
            {shown.map((m) => {
              const home = m.home.slug === team.slug;
              const opponent = home ? m.away : m.home;
              const outcome = view === "previous" ? outcomeForTeam(m, team.slug) : null;
              const live = m.status === "live";
              return (
                <li key={m.id} className="min-w-0">
                  <Link
                    href={`/matches/${m.id}`}
                    title={`${fmtRound(m.round, true)} · ${home ? "vs" : "at"} ${opponent.name}`}
                    className="flex flex-col items-center gap-2 rounded-xl py-1 text-center transition-colors hover:bg-bg"
                  >
                    <span className="text-[11px] font-semibold text-mute xl:text-xs">{fmtRound(m.round)}</span>
                    <Crest team={opponent} size={44} />
                    <span className="whitespace-nowrap text-[11px] font-bold text-mute xl:text-xs">
                      {opponent.short} ({home ? "H" : "A"})
                    </span>
                    {outcome ? (
                      <span
                        title={outcome === "gg_win" ? "Golden goal win" : outcome === "gg_loss" ? "Golden goal loss" : undefined}
                        className={`inline-flex w-full items-center justify-center gap-0.5 rounded-xl px-0.5 py-1.5 text-[11px] font-black tabular-nums xl:gap-1 xl:px-1 xl:text-sm ${OUTCOME_STYLE[outcome].cls}`}
                      >
                        <span>{m.homeGoals}</span>
                        <span aria-hidden>–</span>
                        <span>{m.awayGoals}</span>
                        {(outcome === "gg_win" || outcome === "gg_loss") && (
                          <span className="ml-0.5 hidden text-[9px] font-black opacity-80 xl:inline">GG</span>
                        )}
                      </span>
                    ) : (
                      <span
                        className={`inline-flex w-full items-center justify-center whitespace-nowrap rounded-xl px-0.5 py-1.5 text-[11px] font-black xl:px-1 xl:text-sm ${
                          live ? "bg-red-600 text-white" : "bg-line text-ink"
                        }`}
                      >
                        {live ? "Live" : fmtShortDate(m.kickoff)}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
