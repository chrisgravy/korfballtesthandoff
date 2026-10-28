"use client";

import Link from "next/link";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LeaguePlayer, PlayerMatch, Gender, TrendPoint } from "@/lib/types";

const tick = { fill: "var(--mute)", fontSize: 12 };
const tip = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)" };
const cursor = { fill: "var(--line)", opacity: 0.4 };

function Toggle<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={o === value}
          onClick={() => onChange(o)}
          className={`rounded-full border px-3 py-1 text-sm font-semibold capitalize ${o === value ? "border-pitch bg-pitch text-white" : "border-line text-ink"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function TeamTrendChart({ data, color }: { data: TrendPoint[]; color: string }) {
  const [view, setView] = useState<"points" | "goals">("points");
  return (
    <div>
      <div className="mb-3"><Toggle options={["points", "goals"] as const} value={view} onChange={setView} /></div>
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="round" tick={tick} tickLine={false} />
            <YAxis tick={tick} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tip} labelFormatter={(l) => `Matchweek ${l}`} />
            {view === "goals" && <Legend />}
            {view === "points" && <Line dataKey="points" name="Points" stroke={color} strokeWidth={3} />}
            {view === "goals" && <Line dataKey="gf" name="Scored" stroke={color} strokeWidth={3} />}
            {view === "goals" && <Line dataKey="ga" name="Conceded" stroke="#d6483e" strokeWidth={3} strokeDasharray="5 4" />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function PlayerMatchChart({ data, color }: { data: PlayerMatch[]; color: string }) {
  const [metric, setMetric] = useState<"goals" | "assists" | "rebounds" | "steals" | "turnovers" | "penalties">("goals");
  const rows = data.map((d) => ({ ...d, label: `MW${d.round} ${d.home ? "v" : "@"} ${d.opponent}` }));
  return (
    <div>
      <div className="mb-3"><Toggle options={["goals", "assists", "rebounds", "steals", "turnovers", "penalties"] as const} value={metric} onChange={setMetric} /></div>
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <BarChart data={rows} margin={{ left: -16, right: 8, top: 8 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tick={tick} tickLine={false} interval={0} angle={-30} textAnchor="end" height={60} />
            <YAxis tick={tick} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tip} cursor={cursor} />
            <Bar dataKey={metric} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function StatsExplorer({ players }: { players: LeaguePlayer[] }) {
  const [metric, setMetric] = useState<"goals" | "assists" | "rebounds" | "steals" | "turnovers" | "penalties">("goals");
  const [gender, setGender] = useState<"all" | Gender>("all");
  const top = players
    .filter((p) => gender === "all" || p.gender === gender)
    .sort((a, b) => b[metric] - a[metric])
    .slice(0, 10);
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-3">
        <Toggle options={["goals", "assists", "rebounds", "steals", "turnovers", "penalties"] as const} value={metric} onChange={setMetric} />
        <Toggle options={["all", "M", "F"] as const} value={gender} onChange={setGender} />
      </div>
      <div className="h-96 w-full">
        <ResponsiveContainer>
          <BarChart data={top} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid stroke="var(--line)" horizontal={false} />
            <XAxis type="number" tick={tick} allowDecimals={false} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={120} tick={tick} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tip} cursor={cursor} />
            <Bar dataKey={metric} radius={[0, 4, 4, 0]}>
              {top.map((p) => <Cell key={p.id} fill={p.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ol className="mt-4 divide-y divide-line text-sm">
        {top.map((p, i) => (
          <li key={p.id} className="flex items-center gap-3 py-2">
            <span className="w-5 text-mute">{i + 1}</span>
            <Link href={`/players/${p.id}`} className="font-bold hover:underline">{p.name}</Link>
            <span className="text-mute">{p.team} · {p.gender}</span>
            <b className="ml-auto text-base">{p[metric]}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}