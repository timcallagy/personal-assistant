'use client';

import type { FunnelResponse, FunnelStep } from '@/lib/api';

function pct(users: number, installs: number | null): string {
  if (!installs) return '—';
  return ((users / installs) * 100).toFixed(1) + '%';
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

export function FunnelTable({ data, steps, loading, error, selectedVersions, onRetry }: FunnelTableProps) {
  const visibleSteps = steps.filter((s) => s.visible && s.event !== 'installs');
  const multiVersion = selectedVersions.length >= 2;

  // Total column count: event name + (All Users + All %) + per version (Users + %)
  const colCount = multiVersion
    ? 1 + 2 + selectedVersions.length * 2
    : 3; // event + users + %

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
            <>
              {/* Installs row */}
              <tr className="bg-background border-b border-background-tertiary">
                <td className="px-4 py-3 text-foreground-secondary font-medium">
                  Installs (Google Ads)
                </td>
                {multiVersion ? (
                  <>
                    <td className="text-right px-4 py-3 text-foreground" title={data?.installs === null ? 'Install data unavailable' : undefined}>
                      {data?.installs ?? '—'}
                    </td>
                    <td className="text-right px-4 py-3 text-foreground-muted">100%</td>
                    {selectedVersions.map((v) => (
                      <>
                        <td key={`${v}-u`} className="text-right px-4 py-3 text-foreground">{data?.installs ?? '—'}</td>
                        <td key={`${v}-p`} className="text-right px-4 py-3 text-foreground-muted">100%</td>
                      </>
                    ))}
                  </>
                ) : (
                  <>
                    <td className="text-right px-4 py-3 text-foreground" title={data?.installs === null ? 'Install data unavailable' : undefined}>
                      {data?.installs ?? '—'}
                    </td>
                    <td className="text-right px-4 py-3 text-foreground-muted">100%</td>
                  </>
                )}
              </tr>

              {/* Event rows */}
              {visibleSteps.map((step) => {
                const row = data?.steps.find((r) => r.event === step.event);
                const allUsers = row?.all ?? 0;
                return (
                  <tr key={step.event} className="border-b border-background-tertiary hover:bg-background-secondary/50 transition-colors">
                    <td className="px-4 py-3 text-foreground-secondary font-mono text-xs">{step.event}</td>
                    {multiVersion ? (
                      <>
                        <td className={`text-right px-4 py-3 ${allUsers === 0 ? 'text-foreground-muted' : 'text-foreground'}`}>
                          {allUsers}
                        </td>
                        <td className="text-right px-4 py-3 text-foreground-muted">
                          {pct(allUsers, data?.installs ?? null)}
                        </td>
                        {selectedVersions.map((v) => {
                          const vUsers = row?.versions?.[v] ?? 0;
                          return (
                            <>
                              <td key={`${v}-u`} className={`text-right px-4 py-3 ${vUsers === 0 ? 'text-foreground-muted' : 'text-foreground'}`}>
                                {vUsers}
                              </td>
                              <td key={`${v}-p`} className="text-right px-4 py-3 text-foreground-muted">
                                {pct(vUsers, data?.installs ?? null)}
                              </td>
                            </>
                          );
                        })}
                      </>
                    ) : (
                      <>
                        <td className={`text-right px-4 py-3 ${allUsers === 0 ? 'text-foreground-muted' : 'text-foreground'}`}>
                          {allUsers}
                        </td>
                        <td className="text-right px-4 py-3 text-foreground-muted">
                          {pct(allUsers, data?.installs ?? null)}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
