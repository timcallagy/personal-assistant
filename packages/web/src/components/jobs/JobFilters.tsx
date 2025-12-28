'use client';

import { useState, useEffect } from 'react';

export interface JobsPageFilters {
  search: string;
  crawlStatus: 'all' | 'working' | 'manual';
  showNewOnly: boolean;
  showApplied: boolean;
}

interface JobFiltersProps {
  filters: JobsPageFilters;
  onChange: (filters: JobsPageFilters) => void;
}

export function JobFilters({ filters, onChange }: JobFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onChange({ ...filters, search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters, onChange]);

  const updateFilter = <K extends keyof JobsPageFilters>(
    key: K,
    value: JobsPageFilters[K]
  ) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search jobs and companies..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-background-tertiary rounded-md text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Crawl Status Dropdown */}
      <select
        value={filters.crawlStatus}
        onChange={(e) => updateFilter('crawlStatus', e.target.value as JobsPageFilters['crawlStatus'])}
        className="px-3 py-2 text-sm bg-background border border-background-tertiary rounded-md text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      >
        <option value="all">All Companies</option>
        <option value="working">Auto-crawl Only</option>
        <option value="manual">Manual Only</option>
      </select>

      {/* New Only Checkbox */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.showNewOnly}
          onChange={(e) => updateFilter('showNewOnly', e.target.checked)}
          className="w-4 h-4 rounded border-background-tertiary bg-background text-accent focus:ring-accent focus:ring-offset-0"
        />
        <span className="text-sm text-foreground">New only</span>
      </label>

      {/* Show Applied Checkbox */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.showApplied}
          onChange={(e) => updateFilter('showApplied', e.target.checked)}
          className="w-4 h-4 rounded border-background-tertiary bg-background text-accent focus:ring-accent focus:ring-offset-0"
        />
        <span className="text-sm text-foreground">Show applied</span>
      </label>
    </div>
  );
}
