import { StatsExplorer } from "@/components/charts";
import { currentSeason, getLeaguePlayers, getCurrentDivisions } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ div?: string }> }) {
  const { div } = await searchParams;
  const season = await currentSeason();
  const divisions = await getCurrentDivisions();
  const divisionId = Number(div) || divisions.find(d => d.level === 1)?.id || divisions[0]?.id;
  const currentDiv = divisions.find(d => d.id === divisionId);
  
  const players = await getLeaguePlayers(season.id, divisionId);
  
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <h1 className="text-3xl font-black tracking-tight">Player statistics · {currentDiv?.name} · {season.name}</h1>
        <nav aria-label="Division" className="flex gap-1.5">
          {divisions.map((d) => (
            <a
              key={d.id}
              href={`/stats?div=${d.id}`}
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${d.id === divisionId ? "border-pitch bg-pitch text-white" : "border-line"}`}
            >
              {d.name}
            </a>
          ))}
        </nav>
      </div>
      
      <div className="rounded-xl border border-line bg-card p-4"><StatsExplorer players={players} /></div>
    </main>
  );
}