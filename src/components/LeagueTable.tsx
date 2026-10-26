import Link from "next/link";
import { Crest } from "./Crest";
import type { StandingRow } from "@/lib/types";

export function LeagueTable({ rows, full = false }: { rows: StandingRow[]; full?: boolean }) {
  const n = rows.length;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <thead className="text-xs text-mute">
          <tr>
            <th className="p-2 text-left">#</th>
            <th className="p-2 text-left">Club</th>
            <th>P</th>
            <th title="Win (3 pts)">W</th>
            <th title="Golden Goal Win (2 pts)">GG W</th>
            <th title="Golden Goal Loss (1 pt)">GG L</th>
            <th title="Loss (0 pts)">L</th>
            {full && (<><th>GF</th><th>GA</th></>)}
            <th>GD</th>
            <th className="p-2">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-t border-line text-center">
              <td className={`border-l-4 p-2 text-left font-bold ${i < 4 ? "border-pitch" : i >= n - 2 ? "border-red-600" : "border-transparent"}`}>{i + 1}</td>
              <td className="p-2 text-left">
                <Link href={`/clubs/${r.slug}`} className="flex items-center gap-2 whitespace-nowrap font-bold hover:underline">
                  <Crest team={r} size={22} />{r.name}
                </Link>
              </td>
              <td>{r.played}</td>
              <td>{r.won}</td>
              <td>{r.gg_won}</td>
              <td>{r.gg_lost}</td>
              <td>{r.lost}</td>
              {full && (<><td>{r.gf}</td><td>{r.ga}</td></>)}
              <td>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
              <td className="p-2 font-black">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}