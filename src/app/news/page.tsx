import Link from "next/link";
import { FixtureStrip } from "@/components/FixtureStrip";
import { currentSeason, getCurrentDivisions, getRound, roundBounds } from "@/lib/queries";

export const revalidate = 60;

export default async function NewsPage() {
  const season = await currentSeason();
  const divisions = await getCurrentDivisions();
  const div1 = divisions.find((d) => d.level === 1) ?? divisions[0];

  const { latest } = await roundBounds(season.id, div1.id);
  const matches = await getRound(season.id, div1.id, latest);

  const finished = matches.filter((m) => m.status === "finished");
  const upcoming = matches.filter((m) => m.status === "scheduled");

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-6">
      <h1 className="text-3xl font-black tracking-tight mb-6">League News</h1>

      <section className="mb-8">
        <h2 className="text-xl font-black mb-4">Latest results</h2>
        {finished.length > 0 ? (
          <FixtureStrip matches={finished} />
        ) : (
          <p className="text-mute">No recent results to report.</p>
        )}
      </section>

      <section>
        <h2 className="text-xl font-black mb-4">Upcoming fixtures</h2>
        {upcoming.length > 0 ? (
          <FixtureStrip matches={upcoming} />
        ) : (
          <p className="text-mute">No fixtures scheduled.</p>
        )}
      </section>
    </main>
  );
}
