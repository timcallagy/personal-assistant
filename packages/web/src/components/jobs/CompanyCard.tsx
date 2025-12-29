'use client';

import { useState, useRef, useEffect } from 'react';
import { Company, CrawlLog, CompanyStage } from '@/lib/api';

type CrawlStatus = 'working' | 'running' | 'error' | 'never';

interface CompanyCardProps {
  company: Company;
  jobCount: number;
  lastCrawl: CrawlLog | null;
  isActive: boolean;
  onClick: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

function getCrawlStatus(lastCrawl: CrawlLog | null): CrawlStatus {
  if (lastCrawl?.status === 'success') {
    return 'working';
  }
  if (lastCrawl?.status === 'running') {
    // Check if it's been stuck for more than 5 minutes (likely crashed)
    const startedAt = new Date(lastCrawl.startedAt);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (startedAt < fiveMinutesAgo) {
      return 'error'; // Treat stuck crawls as errors
    }
    return 'running';
  }
  if (lastCrawl?.status === 'failed') {
    return 'error';
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

function formatStage(stage: CompanyStage | null): string {
  if (!stage) return 'Unknown';
  const stageLabels: Record<CompanyStage, string> = {
    'pre-seed': 'Pre-Seed',
    'seed': 'Seed',
    'series-a': 'Series A',
    'series-b': 'Series B',
    'series-c': 'Series C',
    'growth': 'Growth',
    'public': 'Public',
    'acquired': 'Acquired',
  };
  return stageLabels[stage] || stage;
}

const statusConfig: Record<CrawlStatus, { dot: string; text: string }> = {
  working: { dot: 'bg-success', text: 'Working' },
  running: { dot: 'bg-warning', text: 'Crawling...' },
  error: { dot: 'bg-error', text: 'Crawl error' },
  never: { dot: 'bg-foreground-muted', text: 'Never crawled' },
};

function CompanyInfoPopover({ company, onClose }: { company: Company; onClose: () => void }) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const hasMetadata = company.description || company.headquarters || company.foundedYear || company.revenueEstimate || company.stage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        ref={popoverRef}
        className="w-80 max-w-[90vw] p-4 bg-background-secondary border border-background-tertiary rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
      <div className="flex items-center justify-between mb-2">
        <h5 className="font-medium text-foreground">{company.name}</h5>
        <button
          onClick={onClose}
          className="p-1 text-foreground-muted hover:text-foreground rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {hasMetadata ? (
        <div className="space-y-2 text-sm">
          {company.description && (
            <p className="text-foreground-secondary">{company.description}</p>
          )}
          <div className="grid grid-cols-2 gap-2 text-foreground-muted">
            {company.headquarters && (
              <div>
                <span className="text-foreground-secondary">HQ:</span>{' '}
                {company.headquarters}
              </div>
            )}
            {company.foundedYear && (
              <div>
                <span className="text-foreground-secondary">Founded:</span>{' '}
                {company.foundedYear}
              </div>
            )}
            {company.revenueEstimate && (
              <div>
                <span className="text-foreground-secondary">Revenue:</span>{' '}
                {company.revenueEstimate}
              </div>
            )}
            {company.stage && (
              <div>
                <span className="text-foreground-secondary">Stage:</span>{' '}
                {formatStage(company.stage)}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground-muted italic">
          No company info available
        </p>
      )}
      </div>
    </div>
  );
}

export function CompanyCard({
  company,
  jobCount,
  lastCrawl,
  isActive,
  onClick,
  onRefresh,
  isRefreshing,
}: CompanyCardProps) {
  const [showInfo, setShowInfo] = useState(false);
  const crawlStatus = getCrawlStatus(lastCrawl);
  const { dot, text } = statusConfig[crawlStatus];

  return (
    <div
      id={`company-${company.id}`}
      onClick={onClick}
      className={`p-3 rounded-md cursor-pointer transition-colors relative ${
        isActive
          ? 'bg-background-secondary border-l-2 border-accent'
          : 'hover:bg-background-secondary/50'
      }`}
      data-testid="company-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <h4 className="font-medium text-foreground truncate">{company.name}</h4>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowInfo(!showInfo);
            }}
            className="p-0.5 text-foreground-muted hover:text-accent transition-colors rounded flex-shrink-0"
            title="Company info"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRefresh();
          }}
          disabled={isRefreshing}
          className="p-1 text-foreground-muted hover:text-accent transition-colors rounded hover:bg-background-tertiary disabled:opacity-50 flex-shrink-0"
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

      {/* Info Popover */}
      {showInfo && (
        <CompanyInfoPopover company={company} onClose={() => setShowInfo(false)} />
      )}

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
