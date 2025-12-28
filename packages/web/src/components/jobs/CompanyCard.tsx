'use client';

import { Company, CrawlLog } from '@/lib/api';

type CrawlStatus = 'working' | 'manual' | 'error' | 'never';

interface CompanyCardProps {
  company: Company;
  jobCount: number;
  lastCrawl: CrawlLog | null;
  isActive: boolean;
  onClick: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

function getCrawlStatus(company: Company, lastCrawl: CrawlLog | null): CrawlStatus {
  if (lastCrawl?.status === 'success') {
    return 'working';
  }
  if (lastCrawl?.status === 'failed') {
    return 'error';
  }
  if (company.atsType === 'custom' || company.atsType === null) {
    return 'manual';
  }
  return 'never';
}

function formatRelativeTime(dateString: string): string {
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

const statusConfig: Record<CrawlStatus, { dot: string; text: string }> = {
  working: { dot: 'bg-success', text: 'Auto-crawl working' },
  manual: { dot: 'bg-warning', text: 'Manual check needed' },
  error: { dot: 'bg-error', text: 'Crawl error' },
  never: { dot: 'bg-foreground-muted', text: 'Never crawled' },
};

export function CompanyCard({
  company,
  jobCount,
  lastCrawl,
  isActive,
  onClick,
  onRefresh,
  isRefreshing,
}: CompanyCardProps) {
  const crawlStatus = getCrawlStatus(company, lastCrawl);
  const { dot, text } = statusConfig[crawlStatus];

  return (
    <div
      id={`company-${company.id}`}
      onClick={onClick}
      className={`p-3 rounded-md cursor-pointer transition-colors ${
        isActive
          ? 'bg-background-secondary border-l-2 border-accent'
          : 'hover:bg-background-secondary/50'
      }`}
      data-testid="company-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-medium text-foreground truncate">{company.name}</h4>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRefresh();
          }}
          disabled={isRefreshing}
          className="p-1 text-foreground-muted hover:text-accent transition-colors rounded hover:bg-background-tertiary disabled:opacity-50"
          title="Refresh jobs"
        >
          {isRefreshing ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </button>
      </div>

      {/* Status */}
      <div className="mt-2 flex items-center gap-1.5 text-sm text-foreground-secondary">
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        <span>{text}</span>
      </div>

      {/* Info */}
      <div className="mt-1 space-y-0.5 text-sm text-foreground-muted">
        <div>
          Last crawl: {lastCrawl ? formatRelativeTime(lastCrawl.startedAt) : 'Never'}
        </div>
        <div>{jobCount} matching job{jobCount !== 1 ? 's' : ''}</div>
      </div>

      {/* Career page link */}
      <a
        href={company.careerPageUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="mt-2 inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover transition-colors"
      >
        Career Page
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </a>
    </div>
  );
}
