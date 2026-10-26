import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayerMatchChart } from "@/components/charts";
import { currentSeason, getPlayer, getPlayerMatches } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pid = Number(id);
  if (!Number.isInteger(pid)) notFound();
  const player = await getPlayer(pid);
  if (!player) notFound();
  const season = await currentSeason();
  const matches = await getPlayerMatches(pid, season.id);
  
  const sum = (k: keyof typeof matches[0]) => matches.reduce((a, m) => a + (m[k] as number || 0), 0);
  const facts = [
    ["Appearances", matches.length],
    ["Minutes", sum("minutes")],
    ["Goals", sum("goals")],
    ["Assists", sum("assists")],
    ["Rebounds", sum("rebounds")],
    ["Steals", sum("steals")],
    ["Turnovers", sum("turnovers")],
    ["Penalties", sum("penalties")],
  ];

  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-6">
      <div>
        <h1 className="text-4xl font-black tracking-tight">{player.name}</h1>
        <p className="mt-1 text-mute">
          #{player.shirt} · {player.gender} · <Link href={`/clubs/${player.slug}`} className="font-bold text-ink hover:underline">{player.team_name}</Link>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {facts.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-card p-4">
            <div className="text-2xl font-black">{value}</div>
            <div className="text-sm text-mute">{label}</div>
          </div>
        ))}
      </div>
      <section className="rounded-xl border border-line bg-card p-4">
        <h2 className="mb-3 text-xl font-black">Match by match</h2>
        {matches.length ? <PlayerMatchChart data={matches} color={player.color} /> : <p className="text-mute">No appearances yet this season.</p>}
      </section>
    </main>
  );
}