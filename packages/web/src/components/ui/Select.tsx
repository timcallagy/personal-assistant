'use client';

import { useState, useRef, useEffect } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  allowCreate?: boolean;
  onCreateOption?: (value: string) => void;
}

export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select...',
  error,
  allowCreate,
  onCreateOption,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const showCreateOption =
    allowCreate &&
    search.trim() &&
    !options.some((opt) => opt.value.toLowerCase() === search.toLowerCase());

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
    onChange(optionValue);
    setIsOpen(false);
    setSearch('');
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
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full rounded-md border bg-background px-3 py-2 text-left
            focus:outline-none focus:ring-1
            ${error
              ? 'border-error focus:border-error focus:ring-error'
              : 'border-background-tertiary focus:border-accent focus:ring-accent'
            }
          `}
        >
          <span className={selectedOption ? 'text-foreground' : 'text-foreground-muted'}>
            {selectedOption?.label || placeholder}
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2">
            <svg
              className={`h-4 w-4 text-foreground-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-background-tertiary bg-background-secondary shadow-lg">
            {(allowCreate || options.length > 5) && (
              <div className="p-2 border-b border-background-tertiary">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full rounded border border-background-tertiary bg-background px-2 py-1 text-sm focus:outline-none focus:border-accent"
                  autoFocus
                />
              </div>
            )}
            <ul className="max-h-60 overflow-auto py-1">
              {filteredOptions.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`
                      w-full px-3 py-2 text-left text-sm hover:bg-background-tertiary
                      ${opt.value === value ? 'text-accent bg-accent/10' : 'text-foreground'}
                    `}
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
                  No options found
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
