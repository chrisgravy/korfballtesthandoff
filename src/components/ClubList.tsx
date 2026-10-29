import Link from "next/link";
import { Crest } from "./Crest";
import type { Club } from "@/lib/types";

// Row layout, shared by the header row and every club row.
// To add columns later (stadium, website, follow), widen this and add a matching cell to the
// header and to each row, e.g. "grid-cols-[minmax(0,1fr)_16rem_10rem_7rem]".
const COLS = "grid grid-cols-[minmax(0,1fr)] items-center gap-4";

function Chevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 8 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-2 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
    >
      <path d="M1.5 1.5 6.5 6l-5 4.5" />
    </svg>
  );
}

export function ClubList({ clubs }: { clubs: Club[] }) {
  return (
    <section aria-label="Clubs" className="rounded-3xl bg-card px-6 pb-2 pt-5 shadow-sm">
      <div className={`${COLS} pb-4 text-sm font-bold text-ink`}>
        <span>Clubs</span>
      </div>

      <ul>
        {clubs.map((c) => (
          <li key={c.id} className={`${COLS} border-t border-line py-3`}>
            <Link href={`/clubs/${c.slug}`} className="group flex w-fit max-w-full items-center gap-4">
              <Crest team={c} size={44} />
              <span className="truncate text-lg font-bold text-ink group-hover:underline">{c.name}</span>
              <Chevron />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}