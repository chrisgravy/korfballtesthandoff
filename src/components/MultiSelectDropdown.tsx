"use client";

import { useEffect, useRef, useState } from "react";

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  label: string;
}

export function MultiSelectDropdown({
  options,
  values,
  onChange,
  label,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedValues = new Set(values);
  const selectedCount = options.filter((o) => selectedValues.has(o.value)).length;

  const displayValue =
    selectedCount === 0
      ? label
      : selectedCount === options.length
        ? "All"
        : selectedCount === 1
          ? options.find((o) => selectedValues.has(o.value))?.label || label
          : `${selectedCount} selected`;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOpen = () => setOpen((prev) => !prev);

  const toggleOption = (val: string) => {
    const newValues = new Set(values);
    if (newValues.has(val)) {
      newValues.delete(val);
    } else {
      newValues.add(val);
    }
    onChange(Array.from(newValues));
  };

  return (
    <div ref={ref} className="relative inline-block" onClick={toggleOpen}>
      <button
        className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold bg-card text-ink hover:bg-muted"
      >
        {displayValue}
        <span className="ml-1 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 min-w-[220px] max-w-[300px] rounded-lg border border-line bg-card shadow-lg p-2">
          {options.map((option) => (
            <label
              key={option.value}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted cursor-pointer">
              <input
                type="checkbox"
                checked={selectedValues.has(option.value)}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleOption(option.value);
                }}
                className="whitespace-nowrap"
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
