'use client';

import { JobStats } from '@/lib/api';

interface StatsBarProps {
  stats: JobStats | null;
  loading: boolean;
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export function StatsBar({ stats, loading }: StatsBarProps) {
  if (loading) {
    return (
      <div className="py-3 px-4 bg-background-secondary rounded-md">
        <span className="text-sm text-foreground-muted">Loading statistics...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="py-3 px-4 bg-background-secondary rounded-md">
        <span className="text-sm text-foreground-muted">No statistics available</span>
      </div>
    );
  }

  const statItems = [
    { label: 'Jobs', value: stats.totalJobs },
    { label: 'Companies', value: stats.totalCompanies },
    { label: 'New', value: stats.newSinceLastRefresh },
    { label: 'Applied', value: stats.applicationsSubmitted },
  ];

  return (
    <div className="py-3 px-4 bg-background-secondary rounded-md">
      <div className="flex flex-wrap items-center gap-x-2 text-sm">
        {statItems.map((item, index) => (
          <span key={item.label} className="flex items-center">
            <span className="text-foreground font-medium">{item.value}</span>
            <span className="text-foreground-secondary ml-1">{item.label}</span>
            {index < statItems.length - 1 && (
              <span className="text-foreground-muted ml-2">•</span>
            )}
          </span>
        ))}
        <span className="text-foreground-muted">•</span>
        <span className="text-foreground-secondary">
          Last: <span className="text-foreground-muted">{formatRelativeTime(stats.lastRefreshAt)}</span>
        </span>
      </div>
    </div>
  );
}
