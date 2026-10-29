import { ClubList } from "@/components/ClubList";
import { getClubs } from "@/lib/queries";
import {currentSeason} from "@/lib/queries";

export const dynamic = "force-dynamic";

// korfball-clubs.csv also contains a "Social League" entry. It isn't a real club, so it isn't listed.
const EXCLUDED_SLUGS = new Set(["social"]);

export default async function ClubsPage() {
  const clubs = (await getClubs()).filter((c) => !EXCLUDED_SLUGS.has(c.slug));
  const season = await currentSeason();

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-6">
      <h1 className="mb-6 text-3xl font-black tracking-tight"> Clubs - Season {season.name}</h1>
      {clubs.length > 0 ? <ClubList clubs={clubs} /> : <p className="text-mute">No clubs found.</p>}
    </main>
  );
}