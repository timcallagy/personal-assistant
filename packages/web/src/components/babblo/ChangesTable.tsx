'use client';

import { useEffect, useState } from 'react';
import { babbloFunnel, type ChangeEntry } from '@/lib/api';

const CATEGORY_STYLES: Record<string, string> = {
  campaign: 'bg-blue-900/40 text-blue-300 border border-blue-700/50',
  app: 'bg-purple-900/40 text-purple-300 border border-purple-700/50',
};

export function ChangesTable() {
  const [changes, setChanges] = useState<ChangeEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    babbloFunnel.getChanges()
      .then((data) => setChanges(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load changes'));
  }, []);

  if (changes === null && !error) return (
    <div className="mt-8 text-sm text-foreground-muted px-1">Loading changes…</div>
  );
  if (error) return (
    <div className="mt-8 text-sm text-red-400 px-1">Changes log error: {error}</div>
  );
  if (changes!.length === 0) return (
    <div className="mt-8 text-sm text-foreground-muted px-1">No changes recorded yet.</div>
  );

  return (
    <div className="mt-8">
      <h2 className="text-sm font-medium text-foreground-muted uppercase tracking-wide mb-3 px-1">
        Campaign &amp; App Changes
      </h2>
      <div className="overflow-x-auto rounded-md border border-background-tertiary">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-background-tertiary text-foreground-muted text-xs uppercase">
              <th className="text-left px-4 py-2 font-medium">Date</th>
              <th className="text-left px-4 py-2 font-medium">Type</th>
              <th className="text-left px-4 py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {changes!.map((change, i) => (
              <tr key={i} className="border-t border-background-tertiary hover:bg-background-secondary/50 transition-colors">
                <td className="px-4 py-3 text-foreground-secondary whitespace-nowrap">
                  {change.date}
                  <span className="ml-1.5 text-xs text-foreground-muted">{change.time}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_STYLES[change.category] ?? 'bg-background-tertiary text-foreground-muted'}`}>
                    {change.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-foreground-secondary">{change.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
