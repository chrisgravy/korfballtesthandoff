import Link from "next/link";
import { Crest } from "@/components/Crest";
import { getClubs } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ClubsPage() {
  const clubs = await getClubs();
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-3xl font-black tracking-tight">Clubs</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {clubs.map((c) => (
          <Link key={c.id} href={`/clubs/${c.slug}`} className="flex items-center gap-4 rounded-xl border border-line bg-card p-4 hover:border-pitch">
            <Crest team={c} size={48} />
            <span className="text-lg font-extrabold">{c.name}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}