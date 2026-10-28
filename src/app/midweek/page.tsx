import Link from "next/link";
import { FixtureStrip } from "@/components/FixtureStrip";
import { currentSeason, getRound, roundBounds, getCurrentDivisions } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function MidweekPage({ searchParams }: { searchParams: Promise<{ mw?: string; div?: string }> }) {
  const { mw, div } = await searchParams;
  const season = await currentSeason();
  const divisions = await getCurrentDivisions();
  const divisionId = Number(div) || divisions.find(d => d.level === 1)?.id || divisions[0]?.id;
  const currentDiv = divisions.find(d => d.id === divisionId);

  const { latest, total } = await roundBounds(season.id, divisionId);
  const week = Math.min(Math.max(Number(mw) || latest, 1), total);
  const matches = await getRound(season.id, divisionId, week);

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <h1 className="text-3xl font-black tracking-tight">{currentDiv?.name} · Midweek {week}</h1>
        <nav aria-label="Division" className="flex gap-1.5">
          {divisions.map((d) => (
            <Link
              key={d.id}
              href={`/midweek?mw=${week}&div=${d.id}`}
              aria-current={d.id === divisionId ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${d.id === divisionId ? "border-pitch bg-pitch text-white" : "border-line"}`}
            >
              {d.name}
            </Link>
          ))}
        </nav>
      </div>

      <nav aria-label="Matchweek" className="mb-6 flex flex-wrap gap-1.5">
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
          <Link
            key={n}
            href={`/midweek?mw=${n}&div=${divisionId}`}
            aria-current={n === week ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-sm font-semibold ${n === week ? "border-pitch bg-pitch text-white" : "border-line"}`}
          >
            {n}
          </Link>
        ))}
      </nav>

      <div className="[&>div]:flex-wrap"><FixtureStrip matches={matches} /></div>
    </main>
  );
}
