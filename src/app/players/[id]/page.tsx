import { notFound } from "next/navigation";
import { currentSeason, getPlayer, getPlayerMatches, getPlayerCareerMatches, getPlayerSeasonStats } from "@/lib/queries";
import { PlayerTabs } from "@/components/clubs/PlayerTabs";
import type { PlayerMatch } from "@/lib/types";

export const revalidate = 60;

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pid = Number(id);
  if (!Number.isInteger(pid)) notFound();
  const player = await getPlayer(pid);
  if (!player) notFound();
  const season = await currentSeason();
  const matches = await getPlayerMatches(pid, season.id);
  const careerMatches = await getPlayerCareerMatches(pid);
  const seasonStats = await getPlayerSeasonStats(pid);

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-6">
      <PlayerTabs
        player={player}
        season={season}
        matches={matches}
        careerMatches={careerMatches}
        seasonStats={seasonStats}
      />
    </main>
  );
}
