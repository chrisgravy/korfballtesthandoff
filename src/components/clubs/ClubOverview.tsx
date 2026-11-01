import Link from "next/link";
import { Crest } from "@/components/Crest";
import { TeamTrendChart } from "@/components/charts";
import { LeagueTable } from "@/components/LeagueTable";
import { fmtKickoff } from "@/lib/format";
import { ClubCard, Col, Columns, PILL } from "./ClubCard";
import { ClubMatchCard, OutcomeChip, outcomeFor } from "./ClubMatchCard";
import { FormGuide } from "./FormGuide";
import type { Club, Division, Match, StandingRow, Team, TrendPoint, TeamRef } from "@/lib/types";

interface ClubOverviewProps {
  club: Club;
  divisions: Division[];
  standingsByDivision: Record<number, StandingRow[]>;
  standingPosition: number | null;
  standing: StandingRow | null;
  upcomingMatches: Match[];
  recentMatches: Match[];
  trend: TrendPoint[];
  div1Team: Team | null;
  /** The team the form guide is about. Defaults to div1Team. */
  formTeam?: Team | null;
  onSeeAllMatches: () => void;
}

function TeamBlock({ team, bold }: { team: TeamRef; bold: boolean }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-3 text-center">
      <Crest team={team} size={72} />
      <span className={`text-base sm:text-lg ${bold ? "font-black" : "font-semibold"}`}>{team.name}</span>
    </div>
  );
}

export function ClubOverview({
  club,
  divisions,
  standingsByDivision,
  standingPosition,
  standing,
  upcomingMatches,
  recentMatches,
  trend,
  div1Team,
  formTeam,
  onSeeAllMatches,
}: ClubOverviewProps) {
  // Next match, or the latest result once the season is over
  const featured = upcomingMatches[0] ?? recentMatches[0] ?? null;
  const featuredIsNext = upcomingMatches.length > 0;
  const featuredOutcome = featured ? outcomeFor(featured, club.id) : null;

  const divisionById = new Map(divisions.map((d) => [d.id, d]));
  const guideTeam = formTeam ?? div1Team;

  // Mini table: the club's top division
  const tableDivisionId =
    div1Team?.division_id ??
    Object.keys(standingsByDivision)
      .map(Number)
      .sort((a, b) => (divisionById.get(a)?.level ?? 99) - (divisionById.get(b)?.level ?? 99))[0];
  const tableDivision = tableDivisionId != null ? divisionById.get(tableDivisionId) : undefined;
  const tableRows = tableDivisionId != null ? standingsByDivision[tableDivisionId] : undefined;

  const stats = standing
    ? [
        ["Position", standingPosition?.toString() ?? "–"],
        ["Points", standing.points],
        ["Played", standing.played],
        ["Goal difference", standing.gd > 0 ? `+${standing.gd}` : standing.gd],
      ]
    : [];

  return (
    <Columns>
      {/* COLUMN 2: the match */}
      <Col>
        {featured && (
          <ClubCard
            title={featuredIsNext ? "Next match" : "Latest result"}
            action={
              <Link href={`/matches/${featured.id}`} className={PILL}>
                Match centre <span aria-hidden>›</span>
              </Link>
            }
          >
            <div className="px-6 pb-8 pt-2">
              <p className="mb-6 text-center text-xs font-bold uppercase tracking-wide text-mute">
                {featured.division?.name ? `${featured.division.name} · ` : ""}
                {fmtKickoff(featured.kickoff)}
              </p>
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
                <TeamBlock team={featured.home} bold={featured.home.club?.id === club.id} />
                <div className="flex flex-col items-center gap-2">
                  {featured.status === "scheduled" ? (
                    <span className="text-3xl font-black text-mute">vs</span>
                  ) : (
                    <>
                      <span className="text-4xl font-black tabular-nums sm:text-5xl">
                        {featured.homeGoals ?? "–"} – {featured.awayGoals ?? "–"}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wide text-mute">
                        {featured.status === "live" ? "Live" : "Full time"}
                      </span>
                    </>
                  )}
                  {featuredOutcome && <OutcomeChip outcome={featuredOutcome} />}
                </div>
                <TeamBlock team={featured.away} bold={featured.away.club?.id === club.id && featured.home.club?.id !== club.id} />
              </div>
            </div>
          </ClubCard>
        )}

        <ClubCard
          title="Latest results"
          action={
            <button type="button" onClick={onSeeAllMatches} className={PILL}>
              All matches <span aria-hidden>›</span>
            </button>
          }
        >
          {recentMatches.length > 0 ? (
            <div className="divide-y divide-line border-t border-line">
              {recentMatches.slice(0, 5).map((m) => (
                <ClubMatchCard key={m.id} match={m} clubId={club.id} />
              ))}
            </div>
          ) : (
            <p className="border-t border-line px-6 py-8 text-center text-mute">No results yet this season.</p>
          )}
        </ClubCard>

        {div1Team && trend.length > 0 && (
          <ClubCard title={`${div1Team.name} · Season form`}>
            <div className="px-6 pb-6 pt-2">
              <TeamTrendChart data={trend} color={div1Team.color} />
            </div>
          </ClubCard>
        )}
      </Col>

      {/* COLUMN 3: the numbers */}
      <Col>
        {stats.length > 0 && (
          <ClubCard title="Season" action={tableDivision && <span className="text-xs font-bold text-mute">{tableDivision.name}</span>}>
            <div className="grid grid-cols-2 gap-3 px-6 pb-6 pt-1">
              {stats.map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-bg p-4">
                  <div className="text-3xl font-black tabular-nums">{value}</div>
                  <div className="mt-1 text-xs font-semibold text-mute">{label}</div>
                </div>
              ))}
            </div>
          </ClubCard>
        )}

        {guideTeam && (
          <FormGuide
            team={guideTeam}
            matches={[...recentMatches, ...upcomingMatches]}
            label={`${guideTeam.name} · ${divisionById.get(guideTeam.division_id)?.name ?? ""}`}
            logoUrl={club.logo_url}
          />
        )}

        {tableDivision && tableRows && (
          <ClubCard
            title={`${tableDivision.name} table`}
            action={
              <Link href={`/table?div=${tableDivision.id}`} className={PILL}>
                Full table <span aria-hidden>›</span>
              </Link>
            }
          >
            <div className="border-t border-line">
              <LeagueTable rows={tableRows} variant="compact" highlightClubId={club.id} />
            </div>
          </ClubCard>
        )}
      </Col>
    </Columns>
  );
}
