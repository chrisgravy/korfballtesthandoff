"use client";

import { useEffect, useRef, useState } from "react";

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder,
  className,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const displayValue = selectedOption?.label || placeholder;

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

  const selectOption = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative inline-block" onClick={toggleOpen}>
      <button
        className={`rounded-full border border-line px-3 py-1.5 text-sm font-semibold bg-card text-ink hover:bg-muted ${className || ""}`}
      >
        {displayValue}
        <span className="ml-1 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full max-w-xs rounded-lg border border-line bg-card shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={(e) => {
            e.stopPropagation();
            selectOption(option.value);
          }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted hover:text-ink"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
