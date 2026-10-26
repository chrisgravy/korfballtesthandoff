import Link from "next/link";

const LINKS = [
  { href: "/matches", label: "Matches" },
  { href: "/table", label: "Tables" },
  { href: "/stats", label: "Statistics" },
  { href: "/clubs", label: "Clubs" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-10 bg-hd text-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-black tracking-tight">
          <svg className="h-6 w-6 text-sig" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
          Korfball SA
        </Link>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold hover:bg-white/10">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}