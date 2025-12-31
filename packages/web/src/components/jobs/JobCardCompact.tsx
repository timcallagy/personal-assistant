'use client';

import { JobListing } from '@/lib/api';
import { ScoreBreakdownPopover } from './ScoreBreakdownPopover';

interface JobCardCompactProps {
  job: JobListing;
  onMarkApplied: (id: number) => void;
  onMarkNotInterested: (job: JobListing) => void;
  isNew?: boolean;
}

export function JobCardCompact({ job, onMarkApplied, onMarkNotInterested, isNew }: JobCardCompactProps) {
  const locationText = job.location || (job.remote ? 'Remote' : '');
  const isApplied = job.status === 'applied';

  return (
    <div
      className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 p-3 border-b border-background-tertiary hover:bg-background-secondary/50 transition-colors"
      data-testid="job-card-compact"
    >
      {/* Score, Title, Location */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <ScoreBreakdownPopover jobId={job.id} score={job.matchScore} size="sm" />

        <span className="font-medium text-foreground truncate">
          {job.title}
        </span>

        {locationText && (
          <>
            <span className="text-foreground-muted hidden md:inline">•</span>
            <span className="text-sm text-foreground-secondary whitespace-nowrap hidden md:inline">
              {locationText}
            </span>
          </>
        )}

        {isNew && (
          <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" title="New" />
        )}
      </div>

      {/* Mobile/tablet location + Actions row */}
      <div className="flex items-center justify-between md:justify-end gap-2">
        {/* Location on mobile/tablet */}
        {locationText && (
          <span className="text-sm text-foreground-secondary md:hidden truncate max-w-[150px]">
            {locationText}
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-accent hover:text-accent-hover transition-colors rounded hover:bg-background-tertiary"
            title="Apply"
            data-testid="apply-link"
          >
            <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          {isApplied ? (
            <span className="p-2 text-success" title="Applied">
              <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
          ) : (
            <button
              onClick={() => onMarkApplied(job.id)}
              className="p-2 text-foreground-muted hover:text-success transition-colors rounded hover:bg-background-tertiary"
              title="Mark as Applied"
              data-testid="applied-button"
            >
              <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}

          <button
            onClick={() => onMarkNotInterested(job)}
            className="p-2 text-foreground-muted hover:text-error transition-colors rounded hover:bg-background-tertiary"
            title="Not Interested"
            data-testid="dismiss-button"
          >
            <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
