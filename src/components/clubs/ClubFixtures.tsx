import { ClubMatchCard } from "./ClubMatchCard";
import type { Match } from "@/lib/types";

interface ClubFixturesProps {
  upcomingMatches: Match[];
  recentMatches: Match[];
}

export function ClubFixtures({ upcomingMatches, recentMatches }: ClubFixturesProps) {
  return (
    <div className="grid gap-6">
      {upcomingMatches.length > 0 && (
        <section className="rounded-xl border border-line bg-card p-4">
          <h2 className="border-b border-line px-4 py-3 text-xl font-black">
            Upcoming Fixtures
          </h2>
          <div className="divide-y divide-line">
            {upcomingMatches.slice(0, 10).map((m) => (
              <div key={m.id} className="px-4 py-3">
                <ClubMatchCard match={m} />
              </div>
            ))}
          </div>
        </section>
      )}

      {recentMatches.length > 0 && (
        <section className="rounded-xl border border-line bg-card p-4">
          <h2 className="border-b border-line px-4 py-3 text-xl font-black">
            Recent Results
          </h2>
          <div className="divide-y divide-line">
            {recentMatches.slice(0, 10).map((m) => (
              <div key={m.id} className="px-4 py-3">
                <ClubMatchCard match={m} />
              </div>
            ))}
          </div>
        </section>
      )}

      {upcomingMatches.length === 0 && recentMatches.length === 0 && (
        <p className="text-center text-muted py-8">No matches found.</p>
      )}
    </div>
  );
}
