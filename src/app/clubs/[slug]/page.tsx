import { notFound } from "next/navigation";
import { ClubTabs } from "@/components/clubs/ClubTabs";
import { ClubTeamPanel } from "@/components/clubs/ClubTeamPanel";
import {
  currentSeason,
  getClubBySlug,
  getClubWithTeams,
  getDivisions,
  getMatchesByClub,
  getSquad,
  getStandings,
  getTeamTrend,
} from "@/lib/queries";
import type {
  Club,
  Division,
  SeasonRef,
  StandingRow,
  Team,
  SquadPlayer,
  Match,
  TrendPoint,
} from "@/lib/types";

export const revalidate = 60;

export default async function ClubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const club = await getClubBySlug(slug);
  if (!club) notFound();

  const season = await currentSeason();
  const clubWithTeams = await getClubWithTeams(club.id, season.id);
  if (!clubWithTeams) notFound();

  // Identify Division 1 team using division levels
  const divisions = await getDivisions(season.id);
  const divisionLevelMap = new Map(divisions.map((d) => [d.id, d.level]));
  const div1Team = clubWithTeams.teams.find(
    (t) => divisionLevelMap.get(t.division_id) === 1
  );

  // All matches for the club across all divisions
  const allMatches = await getMatchesByClub(season.id, club.id);
  const upcomingMatches = allMatches
    .filter((m) => m.status === "scheduled")
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  const recentMatches = allMatches
    .filter((m) => m.status === "finished")
    .sort((a, b) => b.kickoff.localeCompare(a.kickoff));

  // Standings per division the club participates in
  const clubDivisionIds = [
    ...new Set(clubWithTeams.teams.map((t) => t.division_id)),
  ];
  const standingsResults = await Promise.all(
    clubDivisionIds.map((divId) => getStandings(season.id, divId))
  );
  const standingsByDivision: Record<number, StandingRow[]> = {};
  const clubStandingsByDivision: Record<number, StandingRow | null> = {};
  clubDivisionIds.forEach((divId, i) => {
    standingsByDivision[divId] = standingsResults[i];
    clubStandingsByDivision[divId] =
      standingsResults[i].find((r) => r.club_id === club.id) ?? null;
  });

  // Division 1 standing position (for stat cards)
  let div1StandingPosition: number | null = null;
  if (div1Team) {
    const div1Standings = standingsByDivision[div1Team.division_id] ?? [];
    const idx = div1Standings.findIndex((r) => r.id === div1Team.id);
    if (idx >= 0) div1StandingPosition = idx + 1;
  }

  // Squads for all teams (parallelised)
  const squadsByTeam: Record<number, SquadPlayer[]> = {};
  await Promise.all(
    clubWithTeams.teams.map(async (team) => {
      squadsByTeam[team.id] = await getSquad(team.id);
    })
  );

  // Season form trend for Division 1 team
  let trend: TrendPoint[] = [];
  if (div1Team) {
    trend = await getTeamTrend(season.id, div1Team.division_id, div1Team.id);
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] grid gap-6 px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Left column: Team panel + about info + links */}
        <ClubTeamPanel
          club={club}
          season={season}
          teams={clubWithTeams.teams}
        />

        {/* Right column: Tabbed content */}
        <ClubTabs
          club={club}
          season={season}
          divisions={divisions}
          standingsByDivision={standingsByDivision}
          clubStandingsByDivision={clubStandingsByDivision}
          teams={clubWithTeams.teams}
          squadsByTeam={squadsByTeam}
          upcomingMatches={upcomingMatches}
          recentMatches={recentMatches}
          trend={trend}
          div1Team={div1Team ?? null}
          div1StandingPosition={div1StandingPosition}
        />
      </div>
    </main>
  );
}
