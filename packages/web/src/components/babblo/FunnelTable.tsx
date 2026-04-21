'use client';

import type { FunnelResponse, FunnelStep } from '@/lib/api';

function stepPct(value: number | null, denom: number | null | undefined): string {
  if (value === null || !denom) return '—';
  return ((value / denom) * 100).toFixed(1) + '%';
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
  isChild: boolean;
  // Pre-computed denominator for % — null means show '—'
  denomAllValue: number | null;
  denomVersionValues: Record<string, number | null>;
  crossSource: boolean; // suppress % across Google Ads → PostHog boundary
}

export function FunnelTable({ data, steps, loading, error, selectedVersions, onRetry }: FunnelTableProps) {
  const visibleSteps = steps.filter((s) => s.visible && !PINNED_KEYS.includes(s.event as typeof PINNED_KEYS[number]));
  const multiVersion = selectedVersions.length >= 2;
  const colCount = multiVersion ? 1 + 2 + selectedVersions.length * 2 : 3;

  if (error) {
    return (
      <div className="rounded-md border border-red-700 bg-red-900/20 p-4 flex items-center justify-between">
        <span className="text-red-300 text-sm">{error}</span>
        <button onClick={onRetry} className="ml-4 px-3 py-1.5 rounded bg-red-700 hover:bg-red-600 text-white text-sm transition-colors">
          Retry
        </button>
      </div>
    );
  }

  if (!loading && data && visibleSteps.length === 0) {
    return <p className="text-foreground-muted text-sm p-4">No steps configured. Enable steps in the configurator →</p>;
  }

  // Build pinned rows
  const pinnedRows: OrderedRow[] = [];
  for (let i = 0; i < PINNED_DEFS.length; i++) {
    const { key, label } = PINNED_DEFS[i];
    if (!steps.find((s) => s.event === key)?.visible) continue;
    const allValue = data?.[key] ?? null;
    const prev = pinnedRows[pinnedRows.length - 1] ?? null;
    pinnedRows.push({
      key, label, allValue,
      isPinned: true, isChild: false, crossSource: false,
      denomAllValue: prev ? prev.allValue : null,
      denomVersionValues: {},
    });
  }

  // Build a lookup for parent row values (needed for children's denominators)
  const parentValueByEvent: Record<string, { all: number | null; versions: Record<string, number> }> = {};
  for (const step of visibleSteps) {
    const row = data?.steps.find((r) => r.event === step.event);
    parentValueByEvent[step.event] = { all: row?.all ?? 0, versions: row?.versions ?? {} };
  }

  // Build PostHog rows, interleaving children after their parent
  const lastPinned = pinnedRows[pinnedRows.length - 1] ?? null;
  const posthogRows: OrderedRow[] = [];
  let prevRootRow: OrderedRow | null = null; // tracks the most recent non-child row

  for (const step of visibleSteps) {
    const row = data?.steps.find((r) => r.event === step.event);
    const allValue = row?.all ?? 0;
    const versionValues = row?.versions ?? {};
    const isChild = !!step.parentEvent;

    let denomAllValue: number | null;
    let denomVersionValues: Record<string, number | null>;
    let crossSource = false;

    if (isChild) {
      // Child: % relative to parent
      const parent = parentValueByEvent[step.parentEvent!];
      denomAllValue = parent?.all ?? null;
      denomVersionValues = Object.fromEntries(selectedVersions.map((v) => [v, parent?.versions[v] ?? null]));
    } else {
      // Root row: step-over-step from previous root/pinned
      const prevRow = prevRootRow ?? lastPinned;
      crossSource = !prevRootRow && !!lastPinned; // first PostHog row after pinned rows
      denomAllValue = crossSource ? null : (prevRow?.allValue ?? null);
      denomVersionValues = Object.fromEntries(selectedVersions.map((v) => [v, null]));
    }

    const orderedRow: OrderedRow = {
      key: step.event, label: step.event, allValue, versionValues,
      isPinned: false, isChild, crossSource,
      denomAllValue, denomVersionValues,
    };

    if (!isChild) prevRootRow = orderedRow;
    posthogRows.push(orderedRow);
  }

  const orderedRows: OrderedRow[] = [...pinnedRows, ...posthogRows];

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
              const isFirst = i === 0;
              const allPct = isFirst ? '100%' : row.crossSource ? '—' : stepPct(row.allValue, row.denomAllValue);
              const isLastPinned = row.isPinned && (i === orderedRows.length - 1 || !orderedRows[i + 1]?.isPinned);

              return (
                <tr
                  key={row.key}
                  className={`border-b border-background-tertiary ${row.isPinned ? '' : 'hover:bg-background-secondary/50 transition-colors'} ${isLastPinned ? 'border-b-2' : ''}`}
                  style={row.isPinned ? { background: 'var(--color-background)' } : undefined}
                >
                  <td className={`px-4 py-3 text-foreground-secondary ${row.isPinned ? 'font-medium' : ''} ${row.isChild ? 'pl-8' : ''}`}>
                    {row.isChild && <span className="text-accent/40 mr-1.5 text-xs">⤷</span>}
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
                        if (row.isPinned) {
                          return (
                            <>
                              <td key={`${v}-u`} className="text-right px-4 py-3 text-foreground-muted">—</td>
                              <td key={`${v}-p`} className="text-right px-4 py-3 text-foreground-muted">—</td>
                            </>
                          );
                        }
                        const vUsers = row.versionValues?.[v] ?? 0;
                        const vDenom = row.denomVersionValues[v];
                        const vPct = isFirst ? '100%' : row.crossSource ? '—' : stepPct(vUsers, vDenom);
                        return (
                          <>
                            <td key={`${v}-u`} className={`text-right px-4 py-3 ${vUsers === 0 ? 'text-foreground-muted' : 'text-foreground'}`}>
                              {vUsers}
                            </td>
                            <td key={`${v}-p`} className="text-right px-4 py-3 text-foreground-muted">{vPct}</td>
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
