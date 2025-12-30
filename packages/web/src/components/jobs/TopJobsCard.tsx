'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { JobListing } from '@/lib/api';

interface TopJobsCardProps {
  jobs: JobListing[];
  loading: boolean;
}

export function TopJobsCard({ jobs, loading }: TopJobsCardProps) {
  // Take top 10 sorted by match score (already sorted from API)
  const topJobs = jobs
    .filter(job => job.status !== 'applied')
    .slice(0, 10);

  return (
    <Card padding="none">
      <CardHeader className="p-4 border-b border-background-tertiary">
        <div className="flex items-center justify-between">
          <CardTitle>Top Jobs</CardTitle>
          <Link href="/pa/jobs" className="text-accent text-sm hover:underline">
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 text-foreground-muted">Loading...</div>
        ) : topJobs.length === 0 ? (
          <div className="p-4 text-foreground-muted">No jobs found</div>
        ) : (
          <ul className="divide-y divide-background-tertiary">
            {topJobs.map((job) => (
              <li key={job.id}>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 hover:bg-background-tertiary/50 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-foreground-muted truncate shrink-0 max-w-[120px]">
                      {job.companyName}
                    </span>
                    <span className="text-foreground-muted">•</span>
                    <span className="text-foreground font-medium truncate flex-1">
                      {job.title}
                    </span>
                    {job.location && (
                      <>
                        <span className="text-foreground-muted">•</span>
                        <span className="text-foreground-muted truncate shrink-0 max-w-[100px]">
                          {job.location}
                        </span>
                      </>
                    )}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
