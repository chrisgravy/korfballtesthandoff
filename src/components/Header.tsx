import Image from "next/image";
import Link from "next/link";

const LINKS = [
  { href: "/matches", label: "Matches" },
  { href: "/table", label: "Tables" },
  { href: "/stats", label: "Statistics" },
  { href: "/clubs", label: "Clubs" },
  { href: "/news", label: "News" },
  { href: "/history", label: "History" },
  { href: "/midweek", label: "Midweek" },
  { href: "/about", label: "About" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-hd text-white">
      <div className="mx-auto w-full max-w-[1440px] flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-black tracking-tight">
          {/* Put the league logo at public/brand/logo.png. The white backing keeps dark logos visible on the dark header;
              delete "bg-white p-0.5" if your logo already works on dark. */}
          <Image src="/brand/logo.png" alt="" width={36} height={36} priority className="h-9 w-9 rounded-md" />
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
