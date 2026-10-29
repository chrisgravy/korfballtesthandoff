"use client";

import { useState } from "react";
import { ClubOverview } from "./ClubOverview";
import { ClubSquad } from "./ClubSquad";
import { ClubFixtures } from "./ClubFixtures";
import { ClubTable } from "./ClubTable";
import type {
  Club,
  Division,
  SeasonRef,
  StandingRow,
  Team,
  SquadPlayer,
  Match,
  TrendPoint,
} from "@/lib/types";

type Tab = "overview" | "squad" | "fixtures" | "table";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "squad", label: "Squad" },
  { id: "fixtures", label: "Fixtures" },
  { id: "table", label: "Table" },
];

interface ClubTabsProps {
  club: Club;
  season: SeasonRef;
  divisions: Division[];
  standingsByDivision: Record<number, StandingRow[]>;
  clubStandingsByDivision: Record<number, StandingRow | null>;
  teams: Team[];
  squadsByTeam: Record<number, SquadPlayer[]>;
  upcomingMatches: Match[];
  recentMatches: Match[];
  trend: TrendPoint[];
  div1Team: Team | null;
  div1StandingPosition: number | null;
}

export function ClubTabs({
  club,
  season,
  divisions,
  standingsByDivision,
  clubStandingsByDivision,
  teams,
  squadsByTeam,
  upcomingMatches,
  recentMatches,
  trend,
  div1Team,
  div1StandingPosition,
}: ClubTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const div1DivisionId = div1Team?.division_id ?? -1;

  return (
    <div>
      <div role="tablist" aria-label="Club tabs" className="flex flex-wrap gap-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-2 py-1 text-sm font-semibold capitalize ${
              activeTab === tab.id
                ? `text-ink border-b-2 border-b-[${club.color}]`
                : "text-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "overview" && (
          <ClubOverview
            club={club}
            standingPosition={div1StandingPosition}
            standing={clubStandingsByDivision[div1DivisionId] ?? null}
            recentMatches={recentMatches}
            trend={trend}
            div1Team={div1Team}
          />
        )}
        {activeTab === "squad" && (
          <ClubSquad teams={teams} squadsByTeam={squadsByTeam} />
        )}
        {activeTab === "fixtures" && (
          <ClubFixtures upcomingMatches={upcomingMatches} recentMatches={recentMatches} />
        )}
        {activeTab === "table" && (
          <ClubTable
            standingsByDivision={standingsByDivision}
            divisions={divisions}
          />
        )}
      </div>
    </div>
  );
}
