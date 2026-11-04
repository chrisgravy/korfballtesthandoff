"use client";

import { useState } from "react";
import { PlayerHeader, type Tab } from "./PlayerHeader";
import { PlayerInfo } from "./PlayerInfo";
import { ClubCard, Col, Columns } from "./ClubCard";
import { fmtRound } from "./utils";
import { PlayerMatchChart } from "@/components/charts";
import type { Player, PlayerMatch, SeasonRef } from "@/lib/types";

interface PlayerTabsProps {
  player: Player;
  season: SeasonRef;
  matches: PlayerMatch[];
}

export function PlayerTabs({ player, season, matches }: PlayerTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const sum = (k: keyof PlayerMatch) =>
    matches.reduce((a, m) => a + (m[k] as number || 0), 0);

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
        <PlayerInfo player={player} season={season} />

        {/* COLUMNS 2 + 3: change with the selected tab */}
        <div
          role="tabpanel"
          id="player-panel-overview"
          aria-labelledby="player-tab-overview"
          className="min-w-0"
        >
          {activeTab === "overview" ? (
            <>
              <ClubCard title="Season statistics">
                <div className="grid grid-cols-2 gap-3 px-6 pb-6 pt-1">
                  {[
                    ["Appearances", matches.length],
                    ["Minutes", sum("minutes")],
                    ["Goals", sum("goals")],
                    ["Assists", sum("assists")],
                    ["Rebounds", sum("rebounds")],
                    ["Steals", sum("steals")],
                    ["Turnovers", sum("turnovers")],
                    ["Penalties", sum("penalties")],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-bg p-4">
                      <div className="text-3xl font-black tabular-nums">{value}</div>
                      <div className="mt-1 text-xs font-semibold text-mute">{label}</div>
                    </div>
                  ))}
                </div>
              </ClubCard>

              {matches.length > 0 && player.color && (
                <ClubCard title="Season form">
                  <div className="px-6 pb-6 pt-2">
                    <PlayerMatchChart data={matches} color={player.color} />
                  </div>
                </ClubCard>
              )}

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
          ) : (
            <ClubCard title="All matches">
              {matches.length > 0 ? (
                <table className="w-full text-sm tabular-nums">
                  <thead>
                    <tr>
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
                      <th className="px-2 py-3 text-right text-xs font-bold text-mute uppercase">
                        G
                      </th>
                      <th className="px-2 py-3 text-right text-xs font-bold text-mute uppercase">
                        Ast
                      </th>
                      <th className="px-2 py-3 text-right text-xs font-bold text-mute uppercase">
                        Reb
                      </th>
                      <th className="px-2 py-3 text-right text-xs font-bold text-mute uppercase">
                        Stl
                      </th>
                      <th className="px-2 py-3 text-right text-xs font-bold text-mute uppercase">
                        TO
                      </th>
                      <th className="px-2 py-3 text-right text-xs font-bold text-mute uppercase">
                        Pen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {matches.map((m) => (
                      <tr key={m.round}>
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
                  No matches yet this season.
                </p>
              )}
            </ClubCard>
          )}
        </div>
      </div>
    </div>
  );
}
