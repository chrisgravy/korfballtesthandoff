import Link from "next/link";
import { LeagueTable } from "@/components/LeagueTable";
import type { StandingRow, Division } from "@/lib/types";

interface ClubTableProps {
  standingsByDivision: Record<number, StandingRow[]>;
  divisions: Division[];
}

export function ClubTable({
  standingsByDivision,
  divisions,
}: ClubTableProps) {
  const clubDivisionIds = Object.keys(standingsByDivision).map(Number);

  if (clubDivisionIds.length === 0) {
    return <p className="text-center text-muted py-8">No league table data available.</p>;
  }

  return (
    <div className="grid gap-6">
      {clubDivisionIds.map((divId) => {
        const division = divisions.find((d) => d.id === divId);
        const rows = standingsByDivision[divId];

        if (!division || !rows) return null;

        return (
          <section key={divId} className="rounded-xl border border-line bg-card p-4">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <h2 className="text-xl font-black">{division.name}</h2>
              <Link
                href={`/table?div=${divId}`}
                className="inline-flex items-center gap-1 rounded-full bg-bg px-3 py-1.5 text-xs font-bold hover:underline"
              >
                View full table <span aria-hidden>›</span>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <LeagueTable rows={rows} variant="compact" />
            </div>
          </section>
        );
      })}
    </div>
  );
}
