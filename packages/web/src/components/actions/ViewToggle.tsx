'use client';

interface ViewToggleProps {
  view: 'list' | 'grid';
  onChange: (view: 'list' | 'grid') => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-md border border-background-tertiary bg-background-secondary">
      <button
        type="button"
        onClick={() => onChange('list')}
        className={`
          inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-l-md transition-colors
          ${view === 'list'
            ? 'bg-accent text-background'
            : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
          }
        `}
        aria-pressed={view === 'list'}
        title="List view"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={`
          inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-r-md transition-colors border-l border-background-tertiary
          ${view === 'grid'
            ? 'bg-accent text-background'
            : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
          }
        `}
        aria-pressed={view === 'grid'}
        title="Matrix view"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
      </button>
    </div>
  );
}
