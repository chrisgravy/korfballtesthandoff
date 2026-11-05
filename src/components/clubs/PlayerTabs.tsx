"use client";

import { useState } from "react";
import { PlayerHeader, type Tab } from "./PlayerHeader";
import { PlayerInfo } from "./PlayerInfo";
import { ClubCard, Col, Columns } from "./ClubCard";
import { fmtRound } from "./utils";
import { PlayerMatchChart } from "@/components/charts";
import type { Player, PlayerCareerMatch, PlayerMatch, SeasonRef, SeasonStats } from "@/lib/types";

interface PlayerTabsProps {
  player: Player;
  season: SeasonRef;
  matches: PlayerMatch[];
  careerMatches: PlayerCareerMatch[];
  seasonStats: SeasonStats[];
}

const STAT_KEYS: {
  key: keyof PlayerMatch;
  label: string;
  abbr: string;
  title: string;
}[] = [
  { key: "minutes", label: "Minutes", abbr: "Min", title: "Minutes" },
  { key: "goals", label: "Goals", abbr: "G", title: "Goals" },
  { key: "assists", label: "Assists", abbr: "A", title: "Assists" },
  { key: "rebounds", label: "Rebounds", abbr: "RB", title: "Rebounds" },
  { key: "steals", label: "Steals", abbr: "STL", title: "Steals" },
  { key: "turnovers", label: "Turnovers", abbr: "TO", title: "Turnovers" },
  { key: "penalties", label: "Penalties", abbr: "PEN", title: "Penalties" },
];

export function PlayerTabs({
  player,
  season,
  matches,
  careerMatches,
  seasonStats,
}: PlayerTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("career");
  const [perGame, setPerGame] = useState(false);

  const sum = (k: keyof PlayerMatch, list: PlayerMatch[]) =>
    list.reduce((a, m) => a + (m[k] as number || 0), 0);

  const careerSum = (k: keyof PlayerCareerMatch) =>
    careerMatches.reduce((a, m) => a + (m[k] as number || 0), 0);

  const seasonMatch = seasonStats.find((s) => s.season_id === season.id);

  const earliestSeason =
    seasonStats.length > 0
      ? Math.min(...seasonStats.map((s) => Number(s.season_name))).toString()
      : season.name;

  const games = perGame ? (seasonMatch?.games || 1) : 1;

  // Awards for a given season/division from the division_awards table.
  // This is looked up lazily; since there is no player-award mapping table,
  // we check whether the player's name appears in any award column for
  // their division that season.
  function seasonAwards(ss: SeasonStats): string {
    // No awards table exists yet; column is intentionally blank.
    return "";
  }

  return (
    <div className="grid gap-6">
      <PlayerHeader
        player={player}
        season={season}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        {/* COLUMN 1: player info (stays on every tab) */}
        <PlayerInfo player={player} season={season} earliestSeason={earliestSeason} />

        {/* COLUMNS 2 + 3: change with the selected tab */}
        <div
          role="tabpanel"
          id="player-panel-career"
          aria-labelledby="player-tab-career"
          className="min-w-0"
        >
          {activeTab === "career" ? (
            <>
              {/* Career totals */}
              <ClubCard title="Career totals">
                <div className="grid grid-cols-2 gap-3 px-6 pb-6 pt-1">
                  {[
                    ["Games", careerMatches.length],
                    ["Minutes", careerSum("minutes")],
                    ["Goals", careerSum("goals")],
                    ["Assists", careerSum("assists")],
                    ["Rebounds", careerSum("rebounds")],
                    ["Steals", careerSum("steals")],
                    ["Turnovers", careerSum("turnovers")],
                    ["Penalties", careerSum("penalties")],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-bg p-4">
                      <div className="text-3xl font-black tabular-nums">{value}</div>
                      <div className="mt-1 text-xs font-semibold text-mute">{label}</div>
                    </div>
                  ))}
                </div>
              </ClubCard>

              {/* Current season */}
              {seasonMatch ? (
                <ClubCard title={`This season · ${season.name}`}>
                  <div className="grid grid-cols-2 gap-3 px-6 pb-6 pt-1">
                    {[
                      ["Games", seasonMatch.games],
                      ["Minutes", seasonMatch.minutes],
                      ["Goals", seasonMatch.goals],
                      ["Assists", seasonMatch.assists],
                      ["Rebounds", seasonMatch.rebounds],
                      ["Steals", seasonMatch.steals],
                      ["Turnovers", seasonMatch.turnovers],
                      ["Penalties", seasonMatch.penalties],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl bg-bg p-4">
                        <div className="text-3xl font-black tabular-nums">{value}</div>
                        <div className="mt-1 text-xs font-semibold text-mute">{label}</div>
                      </div>
                    ))}
                  </div>
                </ClubCard>
              ) : (
                <ClubCard title={`This season · ${season.name}`}>
                  <p className="border-t border-line px-6 py-8 text-center text-mute">
                    No stats yet this season.
                  </p>
                </ClubCard>
              )}

              {/* Recent matches */}
              <ClubCard title="Recent matches">
                {matches.length > 0 ? (
                  <div className="divide-y divide-line border-t border-line">
                    {matches.slice(0, 5).map((m) => (
                      <div key={m.round} className="px-6 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-bold">
                              {fmtRound(m.round)} · {m.opponent}
                            </div>
                            <div className="text-xs text-mute">
                              {m.home ? "Home" : "Away"}
                            </div>
                          </div>
                          <div className="text-right text-sm font-bold tabular-nums">
                            {m.goals}G {m.assists}A {m.rebounds}R {m.steals}St
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="border-t border-line px-6 py-8 text-center text-mute">
                    No matches yet this season.
                  </p>
                )}
              </ClubCard>
            </>
          ) : activeTab === "seasons" ? (
            <>
              <ClubCard
                title="Season-by-season"
                action={
                  <button
                    onClick={() => setPerGame((p) => !p)}
                    className="rounded-full border px-3 py-1 text-xs font-bold hover:underline"
                  >
                    {perGame ? "Per game" : "Totals"}
                  </button>
                }
              >
                <table className="w-full text-sm tabular-nums table-fixed">
                  <thead>
                    <tr>
                      <th className="px-1 py-3 text-left text-xs font-bold text-mute uppercase w-10 pl-6">
                        Since
                      </th>
                      <th className="px-1 py-3 text-left text-xs font-bold text-mute uppercase w-10">
                        Division
                      </th>
                      <th className="px-1 py-3 text-left text-xs font-bold text-mute uppercase w-7">
                        Club
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-bold text-mute uppercase w-7">
                        Games
                      </th>
                      {STAT_KEYS.map((s) => (
                        <th
                          key={s.key}
                          className="px-3 py-3 text-right text-xs font-bold text-mute uppercase w-4"
                          title={s.title}
                        >
                          {s.abbr}
                        </th>
                      ))}
                      <th className="px-6 py-3 text-left text-xs font-bold text-mute uppercase w-24">
                        Awards
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {seasonStats.length > 0 ? (
                      seasonStats.map((ss) => {
                        const divisor = perGame ? ss.games : 1;
                        const labelSuffix = perGame ? "/game" : "";
                        return (
                          <tr key={ss.season_id}>
                            <td className="px-1 py-3 font-medium w-16 pl-6">{ss.season_name}</td>
                            <td className="px-1 py-3 w-16">{ss.division_name}</td>
                            <td className="px-1 py-3 w-20">{ss.team_name}</td>
                            <td className="px-3 py-3 text-right w-16">{ss.games}</td>
                            {[STAT_KEYS.map((s) => {
                              const raw = ss[s.key as keyof SeasonStats] as number;
                              const val = perGame ? (raw / divisor).toFixed(1) : raw;
                              return (
                                <td
                                  key={s.key}
                                  className="px-3 py-3 text-right tabular-nums w-12"
                                >
                                  {val}
                                </td>
                              );
                            })]}
                            <td className="px-6 py-3 w-24">{seasonAwards(ss)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={10} className="px-6 py-8 text-center text-mute">
                          No seasons yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </ClubCard>
            </>
          ) : (
            <ClubCard title="All matches">
              {careerMatches.length > 0 ? (
                <table className="w-full text-sm tabular-nums">
                  <thead>
                    <tr>
                      <th className="px-2 py-3 text-left text-xs font-bold text-mute uppercase">
                        Season
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-bold text-mute uppercase">
                        Division
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-bold text-mute uppercase">
                        Round
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-bold text-mute uppercase">
                        Opponent
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-bold text-mute uppercase">
                        Venue
                      </th>
                      <th className="px-2 py-3 text-right text-xs font-bold text-mute uppercase">
                        Minutes
                      </th>
                      {STAT_KEYS.filter((s) => s.key !== "minutes").map((s) => (
                        <th
                          key={s.key}
                          className="px-2 py-3 text-right text-xs font-bold text-mute uppercase"
                          title={s.title}
                        >
                          {s.abbr}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {careerMatches.map((m) => (
                      <tr key={`${m.season_id}-${m.round}`}>
                        <td className="px-2 py-3">{m.season_name}</td>
                        <td className="px-2 py-3">{m.division_name}</td>
                        <td className="px-2 py-3">{fmtRound(m.round)}</td>
                        <td className="px-2 py-3">{m.opponent}</td>
                        <td className="px-2 py-3">{m.home ? "Home" : "Away"}</td>
                        <td className="px-2 py-3 text-right">{m.minutes}</td>
                        <td className="px-2 py-3 text-right font-bold">{m.goals}</td>
                        <td className="px-2 py-3 text-right">{m.assists}</td>
                        <td className="px-2 py-3 text-right">{m.rebounds}</td>
                        <td className="px-2 py-3 text-right">{m.steals}</td>
                        <td className="px-2 py-3 text-right">{m.turnovers}</td>
                        <td className="px-2 py-3 text-right">{m.penalties}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="border-t border-line px-6 py-8 text-center text-mute">
                  No matches yet.
                </p>
              )}
            </ClubCard>
          )}
        </div>
      </div>
    </div>
  );
}
