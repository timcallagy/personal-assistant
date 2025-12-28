'use client';

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
  return (
    <section data-testid="top-jobs-section">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          Top 10 Most Relevant Jobs
        </h2>
      </div>

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
    </section>
  );
}
