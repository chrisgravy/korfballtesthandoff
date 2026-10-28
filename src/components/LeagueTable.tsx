import Link from "next/link";
import { Crest } from "./Crest";
import type { StandingRow } from "@/lib/types";

type Variant = "default" | "full" | "compact";

interface VariantConfig {
  text: string;      // table font size
  crest: number;     // crest size in px
  head: string;      // extra classes on the header row
  headY: string;     // vertical padding on header cells
  rowY: string;      // vertical padding on body cells
  rank: string;      // horizontal padding, # column
  club: string;      // horizontal padding, club column
  stat: string;      // padding, stat columns
  pts: string;       // padding, Pts column
  gap: string;       // gap between crest and club name
  name: string;      // club name weight
  results: boolean;  // show W / GG W / GG L / L
  goals: boolean;    // show GF / GA
  truncate: boolean; // truncate long club names instead of widening the table
}

const VARIANTS = {
  default: {
    text: "text-sm", crest: 22, head: "", headY: "", rowY: "",
    rank: "p-2", club: "p-2", stat: "", pts: "p-2",
    gap: "gap-2", name: "font-bold",
    results: true, goals: false, truncate: false,
  },
  full: {
    text: "text-sm", crest: 22, head: "", headY: "", rowY: "",
    rank: "p-2", club: "p-2", stat: "", pts: "p-2",
    gap: "gap-2", name: "font-bold",
    results: true, goals: true, truncate: false,
  },
  // Matches the "Latest results" card
  compact: {
    text: "text-sm", crest: 28,
    head: "bg-bg font-bold uppercase tracking-wide", headY: "py-1.5", rowY: "py-3",
    rank: "pl-3 pr-1", club: "px-2", stat: "px-2", pts: "pl-2 pr-4",
    gap: "gap-2", name: "font-semibold",
    results: false, goals: false, truncate: true,
  },
} satisfies Record<Variant, VariantConfig>;

interface LeagueTableProps {
  rows: StandingRow[];
  variant?: Variant;
  /** Kept so existing <LeagueTable full /> usages still work. Prefer variant="full". */
  full?: boolean;
  /** When set, wraps the table in the same card as "Latest results". */
  title?: string;
  /** Optional "view all" link shown in the card header (only with title). */
  href?: string;
  linkLabel?: string;
}

export function LeagueTable({
  rows,
  variant,
  full = false,
  title,
  href,
  linkLabel = "View full table",
}: LeagueTableProps) {
  const v = VARIANTS[variant ?? (full ? "full" : "default")];
  const n = rows.length;

  const table = (
    <div className="overflow-x-auto">
      <table className={`w-full tabular-nums ${v.text}`}>
        <thead className={`text-xs text-mute ${v.head}`}>
          <tr>
            <th className={`${v.rank} ${v.headY} text-left`}>#</th>
            <th className={`${v.club} ${v.headY} text-left`}>Club</th>
            <th className={`${v.stat} ${v.headY}`}>P</th>
            {v.results && (
              <>
                <th className={`${v.stat} ${v.headY}`} title="Win (3 pts)">W</th>
                <th className={`${v.stat} ${v.headY}`} title="Golden Goal Win (2 pts)">GG W</th>
                <th className={`${v.stat} ${v.headY}`} title="Golden Goal Loss (1 pt)">GG L</th>
                <th className={`${v.stat} ${v.headY}`} title="Loss (0 pts)">L</th>
              </>
            )}
            {v.goals && (
              <>
                <th className={`${v.stat} ${v.headY}`}>GF</th>
                <th className={`${v.stat} ${v.headY}`}>GA</th>
              </>
            )}
            <th className={`${v.stat} ${v.headY}`}>GD</th>
            <th className={`${v.pts} ${v.headY}`}>Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-t border-line text-center">
              <td
                className={`border-l-4 ${v.rank} ${v.rowY} text-left font-bold ${
                  i < 4 ? "border-pitch" : i >= n - 2 ? "border-red-600" : "border-transparent"
                }`}
              >
                {i + 1}
              </td>
              <td className={`${v.club} ${v.rowY} text-left ${v.truncate ? "w-full max-w-0" : ""}`}>
                <Link
                  href={`/clubs/${r.slug}`}
                  className={`flex items-center ${v.gap} ${v.name} hover:underline ${
                    v.truncate ? "min-w-0" : "whitespace-nowrap"
                  }`}
                >
                  <span className="shrink-0">
                    <Crest team={r} size={v.crest} />
                  </span>
                  <span className={v.truncate ? "truncate" : ""} title={r.name}>
                    {r.name}
                  </span>
                </Link>
              </td>
              <td className={`${v.stat} ${v.rowY}`}>{r.played}</td>
              {v.results && (
                <>
                  <td className={`${v.stat} ${v.rowY}`}>{r.won}</td>
                  <td className={`${v.stat} ${v.rowY}`}>{r.gg_won}</td>
                  <td className={`${v.stat} ${v.rowY}`}>{r.gg_lost}</td>
                  <td className={`${v.stat} ${v.rowY}`}>{r.lost}</td>
                </>
              )}
              {v.goals && (
                <>
                  <td className={`${v.stat} ${v.rowY}`}>{r.gf}</td>
                  <td className={`${v.stat} ${v.rowY}`}>{r.ga}</td>
                </>
              )}
              <td className={`${v.stat} ${v.rowY}`}>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
              <td className={`${v.pts} ${v.rowY} font-black`}>{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (!title) return table;

  // Same card shell and header as RoundResults
  return (
    <section
      className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card"
      aria-label={title}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h2 className="text-xl font-black tracking-tight">{title}</h2>
        {href && (
          <Link
            href={href}
            className="inline-flex items-center gap-1 rounded-full bg-bg px-3 py-1.5 text-xs font-bold hover:underline"
          >
            {linkLabel} <span aria-hidden>›</span>
          </Link>
        )}
      </div>
      <div className="max-h-[30rem] overflow-y-auto overscroll-contain border-t border-line [scrollbar-width:thin] lg:max-h-none">
        {table}
      </div>
    </section>
  );
}