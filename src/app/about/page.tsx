import { Crest } from "@/components/Crest";
import { currentSeason, getClubs, getCurrentDivisions } from "@/lib/queries";

export const revalidate = 60;

export default async function AboutPage() {
  const season = await currentSeason();
  const clubs = await getClubs();
  const divisions = await getCurrentDivisions();

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-6">
      <h1 className="text-3xl font-black tracking-tight mb-6">About</h1>

      <section className="mb-8">
        <h2 className="text-xl font-black mb-4">Korfball South Australia</h2>
        <p className="text-mute">Official league statistics and live scores for Korfball South Australia.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-black mb-4">Current season</h2>
        <div className="rounded-xl border border-line bg-card p-4">
          <div className="text-lg font-black">{season.name}</div>
          <p className="text-mute">{divisions.length} division{divisions.length === 1 ? "" : "s"} · {clubs.length} club{clubs.length === 1 ? "" : "s"}</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black mb-4">Clubs</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((c) => (
            <div key={c.id} className="rounded-xl border border-line bg-card p-4 flex items-center gap-3">
              <Crest team={c} size={32} />
              <div>
                <div className="font-bold">{c.name}</div>
                <div className="text-sm text-mute">{c.short}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
