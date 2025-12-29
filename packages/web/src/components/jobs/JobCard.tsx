'use client';

import { JobListing } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScoreBreakdownPopover } from './ScoreBreakdownPopover';

interface JobCardProps {
  job: JobListing;
  onMarkApplied: (id: number) => void;
  onMarkNotInterested: (job: JobListing) => void;
  isNew?: boolean;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

function stripHtml(text: string): string {
  // Decode HTML entities
  const decoded = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  // Strip HTML tags
  const stripped = decoded.replace(/<[^>]*>/g, ' ');
  // Normalize whitespace
  return stripped.replace(/\s+/g, ' ').trim();
}

export function JobCard({ job, onMarkApplied, onMarkNotInterested, isNew }: JobCardProps) {
  const locationText = job.location || (job.remote ? 'Remote' : 'Location not specified');
  const isApplied = job.status === 'applied';

  return (
    <Card data-testid="job-card">
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <ScoreBreakdownPopover jobId={job.id} score={job.matchScore} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground truncate">
                {job.title}
              </h3>
              {isNew && (
                <span className="bg-accent/20 text-accent text-xs px-2 py-0.5 rounded font-medium">
                  New
                </span>
              )}
            </div>
            <p className="text-foreground-secondary text-sm">
              {job.companyName} • {locationText}
              {job.remote && job.location && ' (Remote)'}
            </p>
          </div>
        </div>

        {/* Description */}
        {job.description && (
          <p className="text-sm text-foreground-secondary">
            {truncateText(stripHtml(job.description), 150)}
          </p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground-muted">
          {job.salaryRange && (
            <span>Salary: {job.salaryRange}</span>
          )}
          <span>Discovered: {formatDate(job.firstSeenAt)}</span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-background-tertiary">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-accent hover:text-accent-hover transition-colors"
            data-testid="apply-link"
          >
            Apply
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>

          <div className="flex-1" />

          {isApplied ? (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-success bg-success/10 rounded">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Applied
            </span>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onMarkApplied(job.id)}
              data-testid="applied-button"
            >
              Application Submitted
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkNotInterested(job)}
            className="text-foreground-muted hover:text-error"
            data-testid="dismiss-button"
          >
            Not Interested
          </Button>
        </div>
      </div>
    </Card>
  );
}
