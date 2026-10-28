"use client";

import { useRouter } from "next/navigation";
import { Dropdown } from "@/components/Dropdown";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";

interface MatchFiltersProps {
  seasons: { id: number; name: string }[];
  divisions: { id: number; name: string }[];
  clubs: { id: number; name: string }[];
  selectedSeasonId: number | null;
  selectedDivisionIds: number[];
  selectedClubIds: number[];
}

export function MatchFilters({
  seasons,
  divisions,
  clubs,
  selectedSeasonId,
  selectedDivisionIds,
  selectedClubIds,
}: MatchFiltersProps) {
  const router = useRouter();

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/matches?${params.toString()}`);
  };

  const updateMultiParam = (key: string, values: string[]) => {
    const params = new URLSearchParams(window.location.search);
    if (values.length > 0) {
      params.set(key, values.join(","));
    } else {
      params.delete(key);
    }
    router.push(`/matches?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2 items-center mb-6">
      {/* League / division */}
      <MultiSelectDropdown
        options={divisions.map((d) => ({ value: String(d.id), label: d.name }))}
        values={selectedDivisionIds.map(String)}
        onChange={(v) => updateMultiParam("division", v)}
        label={divisions.length > 0 ? divisions[0].name : "League"}
      />
      {/* Season */}
      <Dropdown
        options={seasons.map((s) => ({ value: String(s.id), label: s.name }))}
        value={selectedSeasonId ? String(selectedSeasonId) : ""}
        onChange={(v) => updateParam("season", v)}
        placeholder="Season"
      />
      {/* Clubs */}
      <MultiSelectDropdown
        options={clubs.map((c) => ({ value: String(c.id), label: c.name }))}
        values={selectedClubIds.map(String)}
        onChange={(v) => updateMultiParam("club", v)}
        label="Clubs"
      />
      <a
        href="/matches"
        className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold bg-card text-ink hover:bg-muted"
      >
        Reset ↻
      </a>
    </div>
  );
}
