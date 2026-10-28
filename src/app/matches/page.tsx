import Link from "next/link";
import { FixtureStrip } from "@/components/FixtureStrip";
import { MatchFilters } from "@/components/MatchFilters";
import { formatRoundDate } from "@/lib/rounds";
import {
  currentSeason,
  getSeasons,
  getDivisions,
  getClubs,
  getRound,
  roundBounds,
  getMatchesByClub,
} from "@/lib/queries";
import type { Match } from "@/lib/types";

export const dynamic = "force-dynamic";

function roundLabel(round: number): string {
  if (round === 16) return "Semi Final";
  if (round === 17) return "Grand Final";
  return `Round ${round}`;
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{
    mw?: string;
    season?: string;
    division?: string;
    club?: string;
  }>;
}) {
  const { mw, season: seasonIdStr, division: divisionIdStr, club: clubIdStr } =
    await searchParams;

  const seasons = await getSeasons();
  const selectedSeasonId: number = Number(
    seasonIdStr ?? (seasons.find((s) => s.is_current)?.id || seasons[0]?.id || 0)
  );

  const divisions = (await getDivisions(selectedSeasonId)).filter(
    (d) => !d.name.toLowerCase().includes("social")
  );
  const selectedDivisionIds = divisionIdStr
    ? divisionIdStr.split(",").map(Number).filter(Boolean)
    : [];
  const selectedDivisions = divisions.filter((d) =>
    selectedDivisionIds.includes(d.id)
  );

  const clubs = await getClubs();
  const selectedClubIds = clubIdStr
    ? clubIdStr.split(",").map(Number).filter(Boolean)
    : [];
  const selectedClubs = clubs.filter((c) => selectedClubIds.includes(c.id));

  let divisionGroups: Array<{
    division: { id: number; name: string; level: number };
    matches: Match[];
  }> = [];
  let week: number | null = null;
  let total: number | null = null;

  if (selectedClubIds.length > 0) {
    // Club(s) selected: show all matches for those clubs across all rounds
    const allClubMatches = await Promise.all(
      selectedClubIds.map((clubId) =>
        getMatchesByClub(selectedSeasonId, clubId)
      )
    );
    const flatMatches = allClubMatches.flat();

    // Filter by division if divisions are also selected
    const filteredMatches =
      selectedDivisionIds.length > 0
        ? flatMatches.filter((m) =>
            selectedDivisionIds.includes(m.division?.id || 0)
          )
        : flatMatches;

    // Group by division
    const byDiv = new Map<number, Match[]>();
    for (const m of filteredMatches) {
      const divId = m.division?.id || 0;
      if (!byDiv.has(divId)) byDiv.set(divId, []);
      byDiv.get(divId)!.push(m);
    }
    divisionGroups = Array.from(byDiv.entries()).map(([divId, matches]) => ({
      division: {
        id: divId,
        name: matches[0]?.division?.name || "Unknown",
        level: matches[0]?.division?.level || 0,
      },
      matches,
    }));
  } else if (divisions.length > 0) {
    // No club: current behavior by matchweek
    const divisionsToShow =
      selectedDivisionIds.length > 0
        ? selectedDivisions
        : divisions;

    if (divisionsToShow.length > 0) {
      const { latest, total: totalRounds } = await roundBounds(
        selectedSeasonId!,
        divisionsToShow[0].id
      );
      week = Math.min(Math.max(Number(mw) || latest, 1), totalRounds);
      total = totalRounds;

      const allMatches = await Promise.all(
        divisionsToShow.map((d) => getRound(selectedSeasonId, d.id, week!))
      );
      divisionGroups = allMatches.map((matches, i) => ({
        division: divisionsToShow[i],
        matches,
      }));
    }
  }

  // Date for the current round (first match's date)
  const firstKickoff = divisionGroups.flatMap((g) =>
    g.matches.map((m) => m.kickoff)
  ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
  const dateLabel = firstKickoff ? formatRoundDate(firstKickoff) : "";

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-6">
      <MatchFilters
        seasons={seasons}
        divisions={divisions}
        clubs={clubs}
        selectedSeasonId={selectedSeasonId}
        selectedDivisionIds={selectedDivisionIds}
        selectedClubIds={selectedClubIds}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        {/* LEFT: matchweek navigation + fixtures */}
        <div className="min-w-0">
          {/* Matchweek navigation (only when not in club view) */}
          {!selectedClubIds.length && week !== null && total !== null && (
            <div className="mb-8 flex items-center justify-center gap-x-4">
              <Link
                href={`/matches?season=${selectedSeasonId}&division=${selectedDivisionIds.join(
                  ","
                )}&mw=${Math.max(week - 1, 1)}`}
                className={`rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center text-gray-700 font-black hover:bg-gray-200 ${week === 1 ? "opacity-50 pointer-events-none" : ""}`}
              >
                <span>&larr;</span>
              </Link>
              <div className="w-64 text-center">
                <h1 className="text-3xl font-black tracking-tight">{roundLabel(week)}</h1>
                {dateLabel && <p className="text-sm text-mute">{dateLabel}</p>}
              </div>
              <Link
                href={`/matches?season=${selectedSeasonId}&division=${selectedDivisionIds.join(
                  ","
                )}&mw=${Math.min(week + 1, total)}`}
                className={`rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center text-gray-700 font-black hover:bg-gray-200 ${week === total ? "opacity-50 pointer-events-none" : ""}`}
              >
                <span>&rarr;</span>
              </Link>
            </div>
          )}

          {/* Matches content */}
          {divisionGroups.length > 0 ? (
            divisionGroups.map(({ division, matches }) => (
              <section key={division.id} className="mb-8">
                <h2 className="text-xl font-black mb-4">{division.name}</h2>
                <FixtureStrip matches={matches} />
              </section>
            ))
          ) : (
            <p className="text-mute">No matches found.</p>
          )}
        </div>

        {/* RIGHT: reserved for the ladder (not implemented yet) */}
        <aside className="hidden lg:block" />
      </div>
    </main>
  );
}
