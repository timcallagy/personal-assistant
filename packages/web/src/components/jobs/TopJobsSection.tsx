'use client';

import { useState } from 'react';
import { JobListing } from '@/lib/api';
import { JobCard } from './JobCard';

interface TopJobsSectionProps {
  jobs: JobListing[];
  loading: boolean;
  onMarkApplied: (id: number) => void;
  onMarkNotInterested: (job: JobListing) => void;
  newJobIds?: Set<number>;
}

export function TopJobsSection({
  jobs,
  loading,
  onMarkApplied,
  onMarkNotInterested,
  newJobIds,
}: TopJobsSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <section data-testid="top-jobs-section">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between w-full mb-4 group"
      >
        <h2 className="text-lg font-semibold text-foreground">
          Top 10 Most Relevant Jobs
        </h2>
        <span className="text-foreground-muted group-hover:text-foreground transition-colors">
          {isCollapsed ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          )}
        </span>
      </button>

      {!isCollapsed && (
        <>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-background-secondary rounded-lg p-4 animate-pulse"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-6 bg-background-tertiary rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-background-tertiary rounded w-2/3" />
                      <div className="h-4 bg-background-tertiary rounded w-1/2" />
                    </div>
                  </div>
                  <div className="mt-3 h-4 bg-background-tertiary rounded w-full" />
                  <div className="mt-2 h-4 bg-background-tertiary rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-foreground-muted">
              No jobs found
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onMarkApplied={onMarkApplied}
                  onMarkNotInterested={onMarkNotInterested}
                  isNew={newJobIds?.has(job.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
