"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ClubHeader } from "./ClubHeader";
import { ClubInfo } from "./ClubInfo";
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

type Tab = "overview" | "fixtures" | "squad" | "table";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "fixtures", label: "Matches" },
  { id: "squad", label: "Squad" },
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
  /** Team shown in the Overview form guide. Defaults to div1Team. */
  formTeam?: Team | null;
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
  formTeam,
}: ClubTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});

  const div1DivisionId = div1Team?.division_id ?? -1;

  // Arrow keys / Home / End move between tabs, as in a standard tab list
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.id === activeTab);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setActiveTab(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  };

  return (
    <div className="grid gap-6">
      <ClubHeader club={club} season={season}>
        <div
          role="tablist"
          aria-label="Club sections"
          onKeyDown={onKeyDown}
          className="flex overflow-x-auto border-t border-line px-3 [scrollbar-width:none] sm:px-8"
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                type="button"
                role="tab"
                id={`club-tab-${tab.id}`}
                aria-selected={active}
                aria-controls={`club-panel-${tab.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className={`relative whitespace-nowrap px-5 py-4 text-sm font-bold transition-colors focus-visible:-outline-offset-4 ${
                  active ? "text-ink" : "text-mute hover:text-ink"
                }`}
              >
                {tab.label}
                {active && <span className="absolute inset-x-4 bottom-0 h-1 rounded-full bg-ink" />}
              </button>
            );
          })}
        </div>
      </ClubHeader>

      <div className="grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        {/* COLUMN 1: basic club information, the same on every tab */}
        <ClubInfo club={club} season={season} divisions={divisions} teams={teams} />

        {/* COLUMNS 2 + 3: change with the selected tab */}
        <div
          role="tabpanel"
          id={`club-panel-${activeTab}`}
          aria-labelledby={`club-tab-${activeTab}`}
          className="min-w-0"
        >
          {activeTab === "overview" && (
            <ClubOverview
              club={club}
              divisions={divisions}
              standingsByDivision={standingsByDivision}
              standingPosition={div1StandingPosition}
              standing={clubStandingsByDivision[div1DivisionId] ?? null}
              upcomingMatches={upcomingMatches}
              recentMatches={recentMatches}
              trend={trend}
              div1Team={div1Team}
              formTeam={formTeam}
              onSeeAllMatches={() => setActiveTab("fixtures")}
            />
          )}
          {activeTab === "fixtures" && (
            <ClubFixtures
              clubId={club.id}
              divisions={divisions}
              teams={teams}
              upcomingMatches={upcomingMatches}
              recentMatches={recentMatches}
            />
          )}
          {activeTab === "squad" && (
            <ClubSquad club={club} divisions={divisions} teams={teams} squadsByTeam={squadsByTeam} />
          )}
          {activeTab === "table" && (
            <ClubTable clubId={club.id} standingsByDivision={standingsByDivision} divisions={divisions} />
          )}
        </div>
      </div>
    </div>
  );
}
