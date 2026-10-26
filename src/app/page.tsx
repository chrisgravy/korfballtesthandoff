import Link from "next/link";
import { FixtureStrip } from "@/components/FixtureStrip";
import { LeagueTable } from "@/components/LeagueTable";
import { currentSeason, getLeaguePlayers, getMatchweek, getStandings, matchweekBounds, getCurrentDivisions } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const season = await currentSeason();
  const divisions = await getCurrentDivisions();
  const div1 = divisions.find(d => d.level === 1) ?? divisions[0];
  
  const { latest } = await matchweekBounds(season.id, div1.id);
  const [fixtures, table, players] = await Promise.all([
    getMatchweek(season.id, div1.id, latest),
    getStandings(season.id, div1.id),
    getLeaguePlayers(season.id, div1.id),
  ]);
  
  const [first, second] = table;
  const gap = first.points - second.points;
  const headline = gap === 0
    ? `${first.name} and ${second.name} are level at the top`
    : `${first.name} lead ${div1.name} by ${gap} point${gap === 1 ? "" : "s"}`;

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-6">
      <section
        className="relative flex min-h-64 items-end overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: "linear-gradient(180deg, transparent 30%, rgba(5,15,12,.88)), repeating-linear-gradient(90deg, #1c6f45 0 60px, #217a4e 60px 120px)" }}
      >
        <div className="relative max-w-xl">
          <span className="rounded bg-sig px-2 py-0.5 text-xs font-extrabold text-black">{season.name} season</span>
          <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">{headline}</h1>
          <p className="mt-2 opacity-90">After matchweek {latest}, {second.name} are the closest challengers.</p>
        </div>
      </section>

      {/* Division selector */}
      <nav className="flex gap-2 overflow-x-auto pb-2" aria-label="Divisions">
        {divisions.map((d) => (
          <Link
            key={d.id}
            href={`/table?div=${d.id}`}
            className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-bold whitespace-nowrap ${d.id === div1.id ? "border-pitch bg-pitch text-white" : "border-line text-ink hover:bg-muted"}`}
          >
            {d.name}
          </Link>
        ))}
      </nav>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-xl font-black">{div1.name} · Matchweek {latest}</h2>
          <Link href={`/matches?mw=${latest}&div=${div1.id}`} className="text-sm font-bold text-pitch hover:underline">All fixtures</Link>
        </div>
        <FixtureStrip matches={fixtures} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-xl border border-line bg-card">
          <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
            <h2 className="text-xl font-black">{div1.name} table</h2>
            <Link href={`/table?div=${div1.id}`} className="text-sm font-bold text-pitch hover:underline">Full table</Link>
          </div>
          <LeagueTable rows={table} />
        </div>
        <div className="rounded-xl border border-line bg-card">
          <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
            <h2 className="text-xl font-black">Top scorers ({div1.name})</h2>
            <Link href={`/stats?div=${div1.id}`} className="text-sm font-bold text-pitch hover:underline">Explore stats</Link>
          </div>
          <ol className="divide-y divide-line px-4 text-sm">
            {players.slice(0, 6).map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <span className="w-4 text-mute">{i + 1}</span>
                <Link href={`/players/${p.id}`} className="font-bold hover:underline">{p.name}</Link>
                <span className="text-mute">{p.team} · {p.gender}</span>
                <b className="ml-auto text-lg">{p.goals}</b>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}