import Link from "next/link";
import { currentSeason, getSeasons } from "@/lib/queries";

export const revalidate = 60;

export default async function HistoryPage() {
  const season = await currentSeason();
  const seasons = await getSeasons();

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-6">
      <h1 className="text-3xl font-black tracking-tight mb-6">League History</h1>

      <p className="mb-6 text-mute">Past and present seasons of Korfball South Australia.</p>

      <div className="rounded-xl border border-line bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs text-mute uppercase tracking-wider">
            <tr>
              <th className="p-3 text-left">Season</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {seasons.map((s) => (
              <tr key={s.id} className={s.is_current ? "bg-pitch/10" : "bg-card"}>
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3">{s.is_current ? "Current" : "Past"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
