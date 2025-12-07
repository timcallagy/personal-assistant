'use client';

import { useState, useRef, useEffect } from 'react';
import { Badge } from './Badge';

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label?: string;
  values: string[];
  options: MultiSelectOption[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  error?: string;
  allowCreate?: boolean;
  onCreateOption?: (value: string) => void;
}

export function MultiSelect({
  label,
  values,
  options,
  onChange,
  placeholder = 'Select...',
  error,
  allowCreate,
  onCreateOption,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOptions = options.filter((opt) => values.includes(opt.value));

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) &&
      !values.includes(opt.value)
  );

  const showCreateOption =
    allowCreate &&
    search.trim() &&
    !options.some((opt) => opt.value.toLowerCase() === search.toLowerCase()) &&
    !values.includes(search.toLowerCase());

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange([...values, optionValue]);
    setSearch('');
  };

  const handleRemove = (optionValue: string) => {
    onChange(values.filter((v) => v !== optionValue));
  };

  const handleCreate = () => {
    if (onCreateOption && search.trim()) {
      onCreateOption(search.trim());
      handleSelect(search.trim());
    }
  };

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={`
            min-h-[42px] w-full rounded-md border bg-background px-2 py-1.5 cursor-pointer
            focus-within:outline-none focus-within:ring-1
            ${error
              ? 'border-error focus-within:border-error focus-within:ring-error'
              : 'border-background-tertiary focus-within:border-accent focus-within:ring-accent'
            }
          `}
        >
          <div className="flex flex-wrap gap-1">
            {selectedOptions.map((opt) => (
              <Badge key={opt.value} variant="accent" className="flex items-center gap-1">
                {opt.label}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(opt.value);
                  }}
                  className="hover:text-white"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Badge>
            ))}
            {values.length === 0 && (
              <span className="text-foreground-muted py-0.5">{placeholder}</span>
            )}
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-background-tertiary bg-background-secondary shadow-lg">
            <div className="p-2 border-b border-background-tertiary">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search or create..."
                className="w-full rounded border border-background-tertiary bg-background px-2 py-1 text-sm focus:outline-none focus:border-accent"
                autoFocus
              />
            </div>
            <ul className="max-h-60 overflow-auto py-1">
              {filteredOptions.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-background-tertiary"
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
              {showCreateOption && (
                <li>
                  <button
                    type="button"
                    onClick={handleCreate}
                    className="w-full px-3 py-2 text-left text-sm text-accent hover:bg-background-tertiary"
                  >
                    Create &quot;{search}&quot;
                  </button>
                </li>
              )}
              {filteredOptions.length === 0 && !showCreateOption && (
                <li className="px-3 py-2 text-sm text-foreground-muted">
                  {values.length === options.length ? 'All options selected' : 'No options found'}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
    </div>
  );
}
