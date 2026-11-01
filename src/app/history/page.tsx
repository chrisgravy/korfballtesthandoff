import Link from "next/link";
import { getHistoryRows } from "@/lib/queries";

export const revalidate = 60;

export default async function HistoryPage() {
  const rows = await getHistoryRows();

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-6">
      <h1 className="text-3xl font-black tracking-tight mb-6">League History</h1>

      <p className="mb-6 text-mute">
        Past seasons of Korfball South Australia. Social leagues are excluded.
      </p>

      <div className="rounded-xl border border-line bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs text-mute uppercase tracking-wider">
            <tr>
              <th className="p-3 text-left">Season</th>
              <th className="p-3 text-left">Division</th>
              <th className="p-3 text-left">Male MVP</th>
              <th className="p-3 text-left">Female MVP</th>
              <th className="p-3 text-left">Best Attacker</th>
              <th className="p-3 text-left">Best Defender</th>
              <th className="p-3 text-left">Male Top Goal Scorer</th>
              <th className="p-3 text-left">Female Top Goal Scorer</th>
              <th className="p-3 text-left">Champion</th>
              <th className="p-3 text-left">Results</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-4 text-center text-mute">
                  No seasons found.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={`${r.seasonId}-${r.divisionId}`}>
                  <td className="p-3 font-medium">{r.seasonName}</td>
                  <td className="p-3">{r.divisionName}</td>
                  <td className="p-3">{r.maleMvp ?? "–"}</td>
                  <td className="p-3">{r.femaleMvp ?? "–"}</td>
                  <td className="p-3">{r.bestAttacker ?? "–"}</td>
                  <td className="p-3">{r.bestDefender ?? "–"}</td>
                  <td className="p-3">{r.maleTopScorer ?? "–"}</td>
                  <td className="p-3">{r.femaleTopScorer ?? "–"}</td>
                  <td className="p-3 font-medium">{r.champion ?? "–"}</td>
                  <td className="p-3">
                    {r.resultsUrl ? (
                      <Link
                        href={r.resultsUrl}
                        className="font-medium hover:underline"
                      >
                        Results
                      </Link>
                    ) : (
                      "–"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
