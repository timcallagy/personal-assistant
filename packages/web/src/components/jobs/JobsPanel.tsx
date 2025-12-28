'use client';

import { RefObject, useEffect, useRef } from 'react';
import { Company, JobListing } from '@/lib/api';
import { JobCardCompact } from './JobCardCompact';

interface JobsByCompany {
  company: Company;
  jobs: JobListing[];
}

interface JobsPanelProps {
  jobsByCompany: JobsByCompany[];
  onMarkApplied: (id: number) => void;
  onMarkNotInterested: (job: JobListing) => void;
  newJobIds?: Set<number>;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
  panelRef?: RefObject<HTMLDivElement>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export function JobsPanel({
  jobsByCompany,
  onMarkApplied,
  onMarkNotInterested,
  newJobIds,
  loading,
  hasMore,
  onLoadMore,
  loadingMore,
  panelRef,
  onScroll,
}: JobsPanelProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  if (loading) {
    return (
      <div className="h-full p-4 space-y-4" data-testid="jobs-panel">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-5 bg-background-tertiary rounded w-40 mb-3" />
            <div className="space-y-2">
              {[1, 2].map((j) => (
                <div key={j} className="flex items-center gap-3 p-3">
                  <div className="w-10 h-5 bg-background-tertiary rounded-full" />
                  <div className="flex-1 h-4 bg-background-tertiary rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const hasAnyJobs = jobsByCompany.some((g) => g.jobs.length > 0);

  if (!hasAnyJobs) {
    return (
      <div className="h-full flex items-center justify-center text-foreground-muted" data-testid="jobs-panel">
        No matching jobs
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      onScroll={onScroll}
      className="h-full overflow-y-auto"
      data-testid="jobs-panel"
    >
      {jobsByCompany.map(({ company, jobs }) => (
        <div key={company.id} id={`company-jobs-${company.id}`}>
          {/* Company Header */}
          <div className="sticky top-0 bg-background py-2 px-3 border-b border-background-tertiary z-10">
            <h4 className="font-medium text-sm uppercase tracking-wide text-foreground-secondary">
              {company.name} ({jobs.length} job{jobs.length !== 1 ? 's' : ''})
            </h4>
          </div>

          {/* Jobs */}
          {jobs.length === 0 ? (
            <div className="py-4 px-3 text-sm text-foreground-muted">
              No matching jobs
            </div>
          ) : (
            <div>
              {jobs.map((job) => (
                <JobCardCompact
                  key={job.id}
                  job={job}
                  onMarkApplied={onMarkApplied}
                  onMarkNotInterested={onMarkNotInterested}
                  isNew={newJobIds?.has(job.id)}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Infinite scroll sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="py-4 flex justify-center">
          {loadingMore && (
            <svg
              className="w-6 h-6 animate-spin text-accent"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
