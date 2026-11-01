import { Crest } from "@/components/Crest";
import { ClubCard } from "./ClubCard";
import { sortTeams } from "./utils";
import type { Club, Division, SeasonRef, Team } from "@/lib/types";

/** Column 1: the basic club information that stays put while the tabs change. */
export function ClubInfo({
  club,
  season,
  divisions,
  teams,
}: {
  club: Club;
  season: SeasonRef;
  divisions: Division[];
  teams: Team[];
}) {
  const divisionById = new Map(divisions.map((d) => [d.id, d]));
  const details = [
    ["Short name", club.short],
    ["Founded", club.founded],
    ["Coach", club.coach],
    ["Season", season.name],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    // Sticky so the club info stays in view while the long columns scroll
    <aside className="grid content-start gap-6 lg:sticky lg:top-20">
      <ClubCard title="Club info">
        <dl className="border-t border-line">
          {details.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 border-b border-line px-6 py-3 text-sm last:border-b-0"
            >
              <dt className="font-semibold text-mute">{label}</dt>
              <dd className="text-right font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      </ClubCard>

      {teams.length > 0 && (
        <ClubCard title="Teams">
          <ul className="border-t border-line">
            {sortTeams(teams, divisions).map((t) => (
              <li key={t.id} className="flex items-center gap-3 border-b border-line px-6 py-3 last:border-b-0">
                <Crest team={{ ...t, logoUrl: club.logo_url }} size={32} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{t.name}</div>
                  <div className="text-xs text-mute">{divisionById.get(t.division_id)?.name}</div>
                </div>
              </li>
            ))}
          </ul>
        </ClubCard>
      )}
    </aside>
  );
}
