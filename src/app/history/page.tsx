import Link from "next/link";
import { PILL } from "@/components/clubs/ClubCard";
import { getHistoryRows } from "@/lib/queries";

export const revalidate = 60;

const COLUMNS = [
  "Season",
  "Division",
  "Male MVP",
  "Female MVP",
  "Best Attacker",
  "Best Defender",
  "Male Top Goal Scorer",
  "Female Top Goal Scorer",
  "Champion",
  "Results",
];

const Dash = () => <span className="text-mute">–</span>;

export default async function HistoryPage() {
  const rows = await getHistoryRows();

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-6">
      <h1 className="mb-2 text-3xl font-black tracking-tight">League History</h1>
      <p className="mb-6 text-mute">Past seasons of Korfball South Australia.</p>

      <section aria-label="Season history" className="overflow-hidden rounded-3xl bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg text-xs font-bold uppercase tracking-wide text-mute">
              <tr>
                {COLUMNS.map((label, i) => (
                  <th
                    key={label}
                    scope="col"
                    className={`px-4 py-3 text-left align-bottom leading-tight ${i === 0 ? "pl-6" : ""} ${
                      i === COLUMNS.length - 1 ? "pr-6" : ""
                    }`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr className="border-t border-line">
                  <td colSpan={COLUMNS.length} className="px-6 py-8 text-center text-mute">
                    No seasons found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={`${r.seasonId}-${r.divisionId}`}
                    className="border-t border-line transition-colors hover:bg-bg"
                  >
                    <td className="whitespace-nowrap py-4 pl-6 pr-4 font-black">{r.seasonName}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold">{r.divisionName}</td>
                    <td className="whitespace-nowrap px-4 py-4">{r.maleMvp ?? <Dash />}</td>
                    <td className="whitespace-nowrap px-4 py-4">{r.femaleMvp ?? <Dash />}</td>
                    <td className="whitespace-nowrap px-4 py-4">{r.bestAttacker ?? <Dash />}</td>
                    <td className="whitespace-nowrap px-4 py-4">{r.bestDefender ?? <Dash />}</td>
                    <td className="whitespace-nowrap px-4 py-4">{r.maleTopScorer ?? <Dash />}</td>
                    <td className="whitespace-nowrap px-4 py-4">{r.femaleTopScorer ?? <Dash />}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-bold">{r.champion ?? <Dash />}</td>
                    <td className="whitespace-nowrap py-4 pl-4 pr-6">
                      {r.resultsUrl ? (
                        <Link href={r.resultsUrl} className={PILL}>
                          Results <span aria-hidden>›</span>
                        </Link>
                      ) : (
                        <Dash />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
