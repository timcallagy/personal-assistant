'use client';

import type { FunnelResponse, FunnelStep } from '@/lib/api';

function stepPct(value: number | null, prev: number | null | undefined): string {
  if (value === null || !prev) return '—';
  return ((value / prev) * 100).toFixed(1) + '%';
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-background-tertiary rounded animate-pulse w-3/4" />
        </td>
      ))}
    </tr>
  );
}

interface FunnelTableProps {
  data: FunnelResponse | null;
  steps: FunnelStep[];
  loading: boolean;
  error: string | null;
  selectedVersions: string[];
  onRetry: () => void;
}

const PINNED_DEFS = [
  { key: 'impressions' as const, label: 'Impressions (Google Ads)' },
  { key: 'clicks' as const, label: 'Clicks (Google Ads)' },
  { key: 'installs' as const, label: 'Installs / Conversions (Google Ads)' },
] as const;

const PINNED_KEYS = PINNED_DEFS.map((d) => d.key);

interface OrderedRow {
  key: string;
  label: string;
  allValue: number | null;
  versionValues?: Record<string, number>;
  isPinned: boolean;
}

export function FunnelTable({ data, steps, loading, error, selectedVersions, onRetry }: FunnelTableProps) {
  const visibleSteps = steps.filter((s) => s.visible && !PINNED_KEYS.includes(s.event as typeof PINNED_KEYS[number]));
  const multiVersion = selectedVersions.length >= 2;

  const colCount = multiVersion ? 1 + 2 + selectedVersions.length * 2 : 3;

  if (error) {
    return (
      <div className="rounded-md border border-red-700 bg-red-900/20 p-4 flex items-center justify-between">
        <span className="text-red-300 text-sm">{error}</span>
        <button
          onClick={onRetry}
          className="ml-4 px-3 py-1.5 rounded bg-red-700 hover:bg-red-600 text-white text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!loading && data && visibleSteps.length === 0) {
    return (
      <p className="text-foreground-muted text-sm p-4">
        No steps configured. Enable steps in the configurator →
      </p>
    );
  }

  const orderedRows: OrderedRow[] = [
    ...PINNED_DEFS
      .filter(({ key }) => steps.find((s) => s.event === key)?.visible)
      .map(({ key, label }) => ({
        key,
        label,
        allValue: data?.[key] ?? null,
        isPinned: true,
      })),
    ...visibleSteps.map((step) => {
      const row = data?.steps.find((r) => r.event === step.event);
      return {
        key: step.event,
        label: step.event,
        allValue: row?.all ?? 0,
        versionValues: row?.versions,
        isPinned: false,
      };
    }),
  ];

  return (
    <div className="overflow-x-auto rounded-md border border-background-tertiary">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-background-tertiary text-foreground-muted text-xs uppercase">
            <th className="text-left px-4 py-2 font-medium">Step</th>
            {multiVersion ? (
              <>
                <th className="text-right px-4 py-2 font-medium text-foreground">All Users</th>
                <th className="text-right px-4 py-2 font-medium text-foreground">All %</th>
                {selectedVersions.map((v) => (
                  <>
                    <th key={`${v}-u`} className="text-right px-4 py-2 font-medium text-accent truncate max-w-24">{v}</th>
                    <th key={`${v}-p`} className="text-right px-4 py-2 font-medium text-accent/70">%</th>
                  </>
                ))}
              </>
            ) : (
              <>
                <th className="text-right px-4 py-2 font-medium text-foreground">Users</th>
                <th className="text-right px-4 py-2 font-medium">%</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={colCount} />)
          ) : (
            orderedRows.map((row, i) => {
              const prev = i > 0 ? orderedRows[i - 1] : null;
              // Don't compute step-over-step across the Google Ads → PostHog boundary
              const crossSourceBoundary = !row.isPinned && prev?.isPinned;
              const allPct = i === 0 ? '100%' : crossSourceBoundary ? '—' : stepPct(row.allValue, prev?.allValue ?? null);
              const isLastPinned = row.isPinned && (i === orderedRows.length - 1 || !orderedRows[i + 1]?.isPinned);

              return (
                <tr
                  key={row.key}
                  className={`border-b border-background-tertiary ${row.isPinned ? '' : 'hover:bg-background-secondary/50 transition-colors'} ${isLastPinned ? 'border-b-2' : ''}`}
                  style={row.isPinned ? { background: 'var(--color-background)' } : undefined}
                >
                  <td className={`px-4 py-3 text-foreground-secondary ${row.isPinned ? 'font-medium' : ''}`}>
                    {row.label}
                  </td>
                  {multiVersion ? (
                    <>
                      <td
                        className={`text-right px-4 py-3 ${row.allValue === null || row.allValue === 0 ? 'text-foreground-muted' : 'text-foreground'}`}
                        title={row.allValue === null ? 'Data unavailable' : undefined}
                      >
                        {row.allValue ?? '—'}
                      </td>
                      <td className="text-right px-4 py-3 text-foreground-muted">
                        {row.allValue !== null ? allPct : '—'}
                      </td>
                      {selectedVersions.map((v) => {
                        // Pinned rows (Google Ads) have no per-version data
                        if (row.isPinned) {
                          return (
                            <>
                              <td key={`${v}-u`} className="text-right px-4 py-3 text-foreground-muted">—</td>
                              <td key={`${v}-p`} className="text-right px-4 py-3 text-foreground-muted">—</td>
                            </>
                          );
                        }
                        const vUsers = row.versionValues?.[v] ?? 0;
                        const prevVUsers = prev
                          ? (prev.isPinned ? null : (prev.versionValues?.[v] ?? 0))
                          : null;
                        const vPct = stepPct(vUsers, prevVUsers);
                        return (
                          <>
                            <td key={`${v}-u`} className={`text-right px-4 py-3 ${vUsers === 0 ? 'text-foreground-muted' : 'text-foreground'}`}>
                              {vUsers}
                            </td>
                            <td key={`${v}-p`} className="text-right px-4 py-3 text-foreground-muted">
                              {vPct}
                            </td>
                          </>
                        );
                      })}
                    </>
                  ) : (
                    <>
                      <td
                        className={`text-right px-4 py-3 ${row.allValue === null || row.allValue === 0 ? 'text-foreground-muted' : 'text-foreground'}`}
                        title={row.allValue === null ? 'Data unavailable' : undefined}
                      >
                        {row.allValue ?? '—'}
                      </td>
                      <td className="text-right px-4 py-3 text-foreground-muted">
                        {row.allValue !== null ? allPct : '—'}
                      </td>
                    </>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
