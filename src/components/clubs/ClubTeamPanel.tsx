import Link from "next/link";
import { Crest } from "@/components/Crest";
import type { Club, SeasonRef, Team } from "@/lib/types";

interface ClubTeamPanelProps {
  club: Club;
  season: SeasonRef;
  teams: Team[];
}

export function ClubTeamPanel({ club, season, teams }: ClubTeamPanelProps) {
  return (
    <section className="space-y-6">
      {/* Team header */}
      <section className="rounded-2xl border border-line bg-card p-6">
        <div className="flex flex-col items-center text-center">
          <Crest team={club} size={80} />
          <h2 className="mt-2 text-2xl font-black tracking-tight">
            {club.name}
          </h2>
          {club.founded && <p className="text-muted">Est. {club.founded}</p>}
        </div>
      </section>

      {/* About info */}
      <section className="rounded-2xl border border-line bg-card p-6">
        <h3 className="mb-3 text-sm font-bold text-muted uppercase">
          About
        </h3>
        <div className="space-y-3 text-sm">
          {club.short && (
            <div className="flex justify-between border-b border-line pb-2">
              <span className="font-bold">Short name</span>
              <span>{club.short}</span>
            </div>
          )}
          {club.coach && (
            <div className="flex justify-between border-b border-line pb-2">
              <span className="font-bold">Coach</span>
              <span>{club.coach}</span>
            </div>
          )}
          <div className="flex justify-between border-b border-line pb-2">
            <span className="font-bold">Season</span>
            <span>{season.name}</span>
          </div>
        </div>
      </section>

      {/* Links */}
      <section className="rounded-2xl border border-line bg-card p-6">
        <h3 className="mb-3 text-sm font-bold text-muted uppercase">
          Links
        </h3>
        <div className="space-y-2">
          <Link
            href={`/clubs/${club.slug}`}
            className="block rounded-lg border border-line bg-card p-3 text-ink hover:bg-muted hover:border-pitch transition-colors"
          >
            Overview
          </Link>
          <Link
            href="/table"
            className="block rounded-lg border border-line bg-card p-3 text-ink hover:bg-muted hover:border-pitch transition-colors"
          >
            League Table
          </Link>
          <Link
            href="/matches"
            className="block rounded-lg border border-line bg-card p-3 text-ink hover:bg-muted hover:border-pitch transition-colors"
          >
            Fixtures
          </Link>
        </div>
      </section>

      {/* Teams */}
      {teams.length > 0 && (
        <section className="rounded-2xl border border-line bg-card p-6">
          <h3 className="mb-3 text-sm font-bold text-muted uppercase">
            Teams ({season.name})
          </h3>
          <div className="space-y-2">
            {teams.map((team) => (
              <div
                key={team.id}
                className="flex items-center gap-3 p-2 rounded-lg border border-line bg-card hover:bg-muted"
              >
                <Crest team={team} size={32} />
                <span className="text-sm font-bold">{team.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
