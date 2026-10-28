import { notFound } from "next/navigation";
import { Crest } from "@/components/Crest";
import { getMatch } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(Number(id));
  if (!match) notFound();

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-6">
      <h1 className="text-3xl font-black tracking-tight mb-6">Match Stats</h1>

      <div className="rounded-xl border border-line bg-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Crest team={match.home} size={48} />
            <span className="font-bold text-ink truncate text-xl">{match.home.name}</span>
          </div>

          <div className="flex flex-col items-center gap-1 whitespace-nowrap">
            <span className="text-5xl font-black tabular-nums">{match.homeGoals ?? "–"}</span>
            <span className="text-sm font-bold uppercase tracking-tight text-mute">
              {match.status}
            </span>
            <span className="text-5xl font-black tabular-nums">{match.awayGoals ?? "–"}</span>
          </div>

          <div className="flex items-center gap-3 min-w-0 justify-end">
            <span className="font-bold text-ink truncate text-right text-xl">{match.away.name}</span>
            <Crest team={match.away} size={48} />
          </div>
        </div>

        {match.video_url && (
          <div className="mt-6 flex items-center gap-3">
            <a
              href={match.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-pitch text-white px-6 py-2 text-sm font-semibold"
            >
              Watch Full Game
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
