import { ClubCard } from "./ClubCard";
import type { Player, SeasonRef } from "@/lib/types";

/** Column 1: basic player information that stays put while the tabs change. */
export function PlayerInfo({
  player,
  season,
}: {
  player: Player;
  season: SeasonRef;
}) {
  const details = [
    ["Team", player.team_name],
    ["Shirt", player.shirt.toString()],
    ["Gender", player.gender === "M" ? "Male" : "Female"],
    ["Season", season.name],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <aside className="grid content-start gap-6 lg:sticky lg:top-20">
      <ClubCard title="Player info">
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
    </aside>
  );
}
