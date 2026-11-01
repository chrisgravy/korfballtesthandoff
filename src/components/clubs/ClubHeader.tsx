import type { ReactNode } from "react";
import { Crest } from "@/components/Crest";
import type { Club, SeasonRef } from "@/lib/types";

/**
 * Club banner: crest, club name and the season. The club colour is used as a soft tint so it works for
 * every club, including white and yellow ones. The tab bar is passed in as children and sits along the
 * bottom edge of the banner. Club details (founded, coach, teams) live in the left column, see ClubInfo.
 */
export function ClubHeader({
  club,
  season,
  children,
}: {
  club: Club;
  season: SeasonRef;
  children?: ReactNode;
}) {
  return (
    <header className="overflow-hidden rounded-3xl bg-card shadow-sm">
      <div
        className="flex flex-wrap items-center gap-x-6 gap-y-4 px-6 pb-8 pt-8 sm:px-10"
        style={{
          background: `linear-gradient(115deg, color-mix(in srgb, ${club.color} 34%, var(--card)) 0%, var(--card) 70%)`,
        }}
      >
        <Crest team={club} size={96} />
        <div className="min-w-0">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{club.name}</h1>
          <p className="mt-2 text-sm font-semibold text-mute">{season.name} season</p>
        </div>
      </div>
      {children}
    </header>
  );
}
