'use client';

import { useState, useRef, useEffect } from 'react';

type Preset = 'today' | 'yesterday' | '7d' | '30d' | 'custom';

const PRESETS: { label: string; value: Preset }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
];

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

function MultiSelectDropdown({ label, options, selected, onChange }: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const allSelected = selected.length === 0;
  const btnLabel = allSelected ? `All ${label}` : `${selected.length} ${label}`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-background-secondary border border-background-tertiary text-foreground-secondary text-sm hover:bg-background-tertiary transition-colors"
      >
        {btnLabel}
        <span className="ml-1 text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 min-w-48 bg-background-secondary border border-background-tertiary rounded-md shadow-lg py-1 max-h-72 overflow-y-auto">
          {/* Select all / Clear */}
          <div className="flex gap-2 px-3 py-1.5 border-b border-background-tertiary">
            <button
              className="text-xs text-accent hover:underline"
              onClick={() => onChange(options)}
            >
              Select all
            </button>
            <span className="text-foreground-muted">·</span>
            <button
              className="text-xs text-accent hover:underline"
              onClick={() => onChange([])}
            >
              Clear
            </button>
          </div>
          {options.map((opt) => {
            const checked = selected.includes(opt);
            return (
              <label
                key={opt}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-background-tertiary cursor-pointer text-sm text-foreground-secondary"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  className="accent-accent"
                  onChange={() => {
                    onChange(checked ? selected.filter((s) => s !== opt) : [...selected, opt]);
                  }}
                />
                <span className="truncate">{opt}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface FunnelFilterBarProps {
  activePreset: Preset;
  dateFrom: string;
  dateTo: string;
  onPresetChange: (preset: Preset) => void;
  onDateRangeChange: (from: string, to: string) => void;
  availableVersions: string[];
  selectedVersions: string[];
  onVersionsChange: (versions: string[]) => void;
  availableCountries: string[];
  selectedCountries: string[];
  onCountriesChange: (countries: string[]) => void;
}

export function FunnelFilterBar({
  activePreset,
  dateFrom,
  dateTo,
  onPresetChange,
  onDateRangeChange,
  availableVersions,
  selectedVersions,
  onVersionsChange,
  availableCountries,
  selectedCountries,
  onCountriesChange,
}: FunnelFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-background-tertiary bg-background-secondary">
      {/* Date presets */}
      <div className="flex items-center gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPresetChange(p.value)}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              activePreset === p.value
                ? 'bg-accent text-white'
                : 'bg-background-tertiary text-foreground-secondary hover:text-foreground'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      <div className="flex items-center gap-1 text-sm text-foreground-secondary">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateRangeChange(e.target.value, dateTo)}
          className="px-2 py-1.5 rounded-md bg-background-tertiary border border-background-tertiary text-foreground-secondary text-sm focus:outline-none focus:border-accent"
        />
        <span>→</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateRangeChange(dateFrom, e.target.value)}
          className="px-2 py-1.5 rounded-md bg-background-tertiary border border-background-tertiary text-foreground-secondary text-sm focus:outline-none focus:border-accent"
        />
      </div>

      {/* Version + country filters */}
      <div className="flex items-center gap-2 ml-auto">
        <MultiSelectDropdown
          label="versions"
          options={availableVersions}
          selected={selectedVersions}
          onChange={onVersionsChange}
        />
        <MultiSelectDropdown
          label="countries"
          options={availableCountries}
          selected={selectedCountries}
          onChange={onCountriesChange}
        />
      </div>
    </div>
  );
}
