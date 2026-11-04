"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import type { Player, SeasonRef } from "@/lib/types";

/** Tabs available on the player page. */
export type Tab = "overview" | "matches";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "matches", label: "Matches" },
];

interface PlayerHeaderProps {
  player: Player;
  season: SeasonRef;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  children?: ReactNode;
}

/** Player banner: name, team, season, plus the tab bar. */
export function PlayerHeader({
  player,
  season,
  activeTab,
  onTabChange,
  children,
}: PlayerHeaderProps) {
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const initials = player.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.id === activeTab);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onTabChange(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  };

  return (
    <header className="overflow-hidden rounded-3xl bg-card shadow-sm">
      <div
        className="flex flex-wrap items-center gap-x-6 gap-y-4 px-6 pb-8 pt-8 sm:px-10"
        style={{
          background: `linear-gradient(115deg, color-mix(in srgb, ${player.color} 34%, var(--card)) 0%, var(--card) 70%)`,
        }}
      >
        <div className="flex shrink-0 items-center justify-center w-24 h-24 rounded-full bg-mute/20 text-mute font-black text-4xl">
          {initials}
        </div>
        <div className="min-w-0">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{player.name}</h1>
          <p className="mt-2 text-sm font-semibold text-mute">
            {player.team_name} · {season.name} season
          </p>
        </div>
      </div>
      <div
        role="tablist"
        aria-label="Player sections"
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
              id={`player-tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`player-panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              className={`relative whitespace-nowrap px-5 py-4 text-sm font-bold transition-colors focus-visible:-outline-offset-4 ${
                active ? "text-ink" : "text-mute hover:text-ink"
              }`}
            >
              {tab.label}
              {active && (
                <span className="absolute inset-x-4 bottom-0 h-1 rounded-full bg-ink" />
              )}
            </button>
          );
        })}
      </div>
      {children}
    </header>
  );
}
