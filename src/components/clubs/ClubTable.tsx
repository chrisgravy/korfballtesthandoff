import Link from "next/link";
import { LeagueTable } from "@/components/LeagueTable";
import { ClubCard, Col, Columns, PILL } from "./ClubCard";
import type { StandingRow, Division } from "@/lib/types";

interface ClubTableProps {
  clubId: number;
  standingsByDivision: Record<number, StandingRow[]>;
  divisions: Division[];
}

/** One column per division the club plays in, with the club's own rows highlighted. */
export function ClubTable({ clubId, standingsByDivision, divisions }: ClubTableProps) {
  const clubDivs = divisions
    .filter((d) => standingsByDivision[d.id])
    .sort((a, b) => a.level - b.level);

  if (clubDivs.length === 0) {
    return <p className="py-8 text-center text-mute">No league table data available.</p>;
  }

  return (
    <Columns>
      {clubDivs.map((d) => (
        <Col key={d.id}>
          <ClubCard
            title={d.name}
            action={
              <Link href={`/table?div=${d.id}`} className={PILL}>
                Full table <span aria-hidden>›</span>
              </Link>
            }
          >
            <div className="border-t border-line">
              <LeagueTable rows={standingsByDivision[d.id]} variant="compact" highlightClubId={clubId} />
            </div>
          </ClubCard>
        </Col>
      ))}
    </Columns>
  );
}
