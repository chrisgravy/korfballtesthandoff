import { ClubCard, Col, Columns } from "./ClubCard";
import { ClubMatchCard } from "./ClubMatchCard";
import { clubDivisions } from "./utils";
import type { Division, Match, Team } from "@/lib/types";

interface ClubFixturesProps {
  clubId: number;
  divisions: Division[];
  teams: Team[];
  upcomingMatches: Match[];
  recentMatches: Match[];
}

const BAND = "bg-bg px-6 py-1.5 text-xs font-bold uppercase tracking-wide text-mute";

/** One column per division the club plays in: upcoming fixtures first, then results. */
export function ClubFixtures({ clubId, divisions, teams, upcomingMatches, recentMatches }: ClubFixturesProps) {
  const clubDivs = clubDivisions(teams, divisions);

  if (upcomingMatches.length === 0 && recentMatches.length === 0) {
    return <p className="py-8 text-center text-mute">No matches found.</p>;
  }

  return (
    <Columns>
      {clubDivs.map((d) => {
        const upcoming = upcomingMatches.filter((m) => m.division_id === d.id);
        const results = recentMatches.filter((m) => m.division_id === d.id);
        const names = teams.filter((t) => t.division_id === d.id).map((t) => t.name).join(", ");
        return (
          <Col key={d.id}>
            <ClubCard title={d.name} action={<span className="text-xs font-bold text-mute">{names}</span>}>
              <div className="border-t border-line">
                {upcoming.length > 0 && (
                  <>
                    <div className={BAND}>Upcoming</div>
                    <div className="divide-y divide-line">
                      {upcoming.map((m) => (
                        <ClubMatchCard key={m.id} match={m} clubId={clubId} showDivision={false} />
                      ))}
                    </div>
                  </>
                )}
                {results.length > 0 && (
                  <>
                    <div className={`${BAND} ${upcoming.length > 0 ? "border-t border-line" : ""}`}>Results</div>
                    <div className="divide-y divide-line">
                      {results.map((m) => (
                        <ClubMatchCard key={m.id} match={m} clubId={clubId} showDivision={false} />
                      ))}
                    </div>
                  </>
                )}
                {upcoming.length === 0 && results.length === 0 && (
                  <p className="px-6 py-8 text-center text-mute">No matches in this division.</p>
                )}
              </div>
            </ClubCard>
          </Col>
        );
      })}
    </Columns>
  );
}
