'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { useJobs } from '@/hooks/useJobs';
import { useCompanies } from '@/hooks/useCompanies';
import { useJobStats } from '@/hooks/useJobStats';
import { jobs as jobsApi, JobListing, CrawlLog } from '@/lib/api';
import { StatsBar } from '@/components/jobs/StatsBar';
import { JobFilters, JobsPageFilters } from '@/components/jobs/JobFilters';
import { TopJobsSection } from '@/components/jobs/TopJobsSection';
import { CompanyJobsSection } from '@/components/jobs/CompanyJobsSection';
import { ConfirmDismissModal } from '@/components/jobs/ConfirmDismissModal';
import { CrawlProgressIndicator } from '@/components/jobs/CrawlProgressIndicator';

interface DismissModalState {
  isOpen: boolean;
  job: JobListing | null;
  loading: boolean;
}

export default function JobsPage() {
  // Data hooks
  const {
    jobs,
    loading: jobsLoading,
    error: jobsError,
    refresh: refreshJobs,
    markApplied,
    markDismissed,
    hasMore,
    loadMore,
    loadingMore,
  } = useJobs({ initialFilters: { status: 'new' } });

  const {
    companies,
    loading: companiesLoading,
    error: companiesError,
    crawlCompany,
    crawlAll,
    crawlingCompanyId,
    crawlingAll,
  } = useCompanies();

  const {
    stats,
    loading: statsLoading,
    refresh: refreshStats,
  } = useJobStats();

  // Crawl logs state
  const [crawlLogs, setCrawlLogs] = useState<CrawlLog[]>([]);
  const [crawlLogsLoading, setCrawlLogsLoading] = useState(true);

  // Page filters state
  const [pageFilters, setPageFilters] = useState<JobsPageFilters>({
    search: '',
    crawlStatus: 'all',
    showNewOnly: false,
    showApplied: false,
  });

  // Dismiss modal state
  const [dismissModal, setDismissModal] = useState<DismissModalState>({
    isOpen: false,
    job: null,
    loading: false,
  });

  // Track new job IDs (jobs seen since last refresh)
  const [previousJobIds, setPreviousJobIds] = useState<Set<number>>(new Set());
  const [newJobIds, setNewJobIds] = useState<Set<number>>(new Set());

  // Fetch crawl logs
  useEffect(() => {
    const fetchCrawlLogs = async () => {
      setCrawlLogsLoading(true);
      try {
        const response = await jobsApi.getCrawlLogs(100);
        setCrawlLogs(response.logs);
      } catch {
        // Silently fail - crawl logs are not critical
      } finally {
        setCrawlLogsLoading(false);
      }
    };
    fetchCrawlLogs();
  }, []);

  // Track new jobs after refresh
  useEffect(() => {
    if (jobs.length > 0 && previousJobIds.size > 0) {
      const newIds = new Set<number>();
      jobs.forEach((job) => {
        if (!previousJobIds.has(job.id)) {
          newIds.add(job.id);
        }
      });
      setNewJobIds(newIds);
    }
  }, [jobs, previousJobIds]);

  // Helper to determine crawl status from log (handles stuck 'running' logs)
  const getCrawlStatusFromLog = useCallback((log: CrawlLog | undefined): 'working' | 'error' | 'never' => {
    if (!log) return 'never';
    if (log.status === 'success') return 'working';
    if (log.status === 'failed') return 'error';
    if (log.status === 'running') {
      // Treat stuck crawls (>5 min) as errors
      const startedAt = new Date(log.startedAt);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return startedAt < fiveMinutesAgo ? 'error' : 'working';
    }
    return 'never';
  }, []);

  // Filter jobs based on page filters
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Search filter
      if (pageFilters.search) {
        const searchLower = pageFilters.search.toLowerCase();
        const matchesSearch =
          job.title.toLowerCase().includes(searchLower) ||
          (job.companyName && job.companyName.toLowerCase().includes(searchLower)) ||
          (job.location && job.location.toLowerCase().includes(searchLower)) ||
          (job.description && job.description.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Crawl status filter
      if (pageFilters.crawlStatus !== 'all') {
        const log = crawlLogs.find((l) => l.companyId === job.companyId);
        const status = getCrawlStatusFromLog(log);
        if (pageFilters.crawlStatus !== status) return false;
      }

      // New only filter
      if (pageFilters.showNewOnly && !newJobIds.has(job.id)) {
        return false;
      }

      // Applied filter (inverse - hide applied unless checked)
      if (!pageFilters.showApplied && job.status === 'applied') {
        return false;
      }

      return true;
    });
  }, [jobs, crawlLogs, pageFilters, newJobIds, getCrawlStatusFromLog]);

  // Filter companies based on crawl status
  const filteredCompanies = useMemo(() => {
    if (pageFilters.crawlStatus === 'all') {
      return companies;
    }
    return companies.filter((company) => {
      const log = crawlLogs.find((l) => l.companyId === company.id);
      const status = getCrawlStatusFromLog(log);
      return pageFilters.crawlStatus === status;
    });
  }, [companies, crawlLogs, pageFilters.crawlStatus, getCrawlStatusFromLog]);

  // Top 10 jobs (highest match score, excluding applied)
  const topJobs = useMemo(() => {
    return filteredJobs
      .filter((job) => job.status !== 'applied')
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
      .slice(0, 10);
  }, [filteredJobs]);

  // Jobs grouped by company
  const jobsByCompany = useMemo(() => {
    const companyJobsMap = new Map<number, JobListing[]>();

    filteredJobs.forEach((job) => {
      const existing = companyJobsMap.get(job.companyId) || [];
      companyJobsMap.set(job.companyId, [...existing, job]);
    });

    return filteredCompanies.map((company) => ({
      company,
      jobs: (companyJobsMap.get(company.id) || []).sort(
        (a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0)
      ),
    }));
  }, [filteredCompanies, filteredJobs]);

  // Error state for crawl operations
  const [crawlError, setCrawlError] = useState<string | null>(null);

  // Handlers
  const handleRefreshAll = useCallback(async () => {
    // Store current job IDs before refresh
    setPreviousJobIds(new Set(jobs.map((j) => j.id)));
    setCrawlError(null);

    try {
      await crawlAll();
      await Promise.all([refreshJobs(), refreshStats()]);

      // Refresh crawl logs
      try {
        const response = await jobsApi.getCrawlLogs(100);
        setCrawlLogs(response.logs);
      } catch {
        // Silently fail
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh jobs';
      setCrawlError(message);
      // Still try to refresh data in case partial success
      await Promise.all([refreshJobs(), refreshStats()]);
      try {
        const response = await jobsApi.getCrawlLogs(100);
        setCrawlLogs(response.logs);
      } catch {
        // Silently fail
      }
    }
  }, [jobs, crawlAll, refreshJobs, refreshStats]);

  const handleCompanyRefresh = useCallback(
    async (companyId: number) => {
      await crawlCompany(companyId);
      await refreshJobs();

      // Refresh crawl logs
      try {
        const response = await jobsApi.getCrawlLogs(100);
        setCrawlLogs(response.logs);
      } catch {
        // Silently fail
      }
    },
    [crawlCompany, refreshJobs]
  );

  const handleMarkApplied = useCallback(
    async (id: number) => {
      await markApplied(id);
      await refreshStats();
    },
    [markApplied, refreshStats]
  );

  const handleMarkNotInterested = useCallback((job: JobListing) => {
    setDismissModal({
      isOpen: true,
      job,
      loading: false,
    });
  }, []);

  const handleConfirmDismiss = useCallback(async () => {
    if (!dismissModal.job) return;

    setDismissModal((prev) => ({ ...prev, loading: true }));
    try {
      await markDismissed(dismissModal.job.id);
      await refreshStats();
      setDismissModal({ isOpen: false, job: null, loading: false });
    } catch {
      setDismissModal((prev) => ({ ...prev, loading: false }));
    }
  }, [dismissModal.job, markDismissed, refreshStats]);

  const handleCloseDismissModal = useCallback(() => {
    if (!dismissModal.loading) {
      setDismissModal({ isOpen: false, job: null, loading: false });
    }
  }, [dismissModal.loading]);

  const handleCompanyClick = useCallback((companyId: number) => {
    // The split view handles scrolling internally
    console.log('Company clicked:', companyId);
  }, []);

  const loading = jobsLoading || companiesLoading || crawlLogsLoading;
  const error = jobsError || companiesError;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Jobs</h1>
            <p className="text-foreground-muted">
              Discover new opportunities from tracked companies
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/pa/jobs/preferences"
              className="text-sm text-accent hover:text-accent-hover"
            >
              Preferences
            </a>
            <Button
              variant="primary"
              onClick={handleRefreshAll}
              loading={crawlingAll}
              disabled={crawlingAll}
            >
              Refresh All
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <StatsBar stats={stats} loading={statsLoading} />

        {/* Crawl Progress */}
        <CrawlProgressIndicator
          isRunning={crawlingAll}
          message="Refreshing all companies..."
        />

        {/* Filters */}
        <JobFilters filters={pageFilters} onChange={setPageFilters} />

        {/* Error */}
        {(error || crawlError) && (
          <div className="p-4 bg-error/20 text-error rounded-md">
            {error || crawlError}
            <Button
              variant="ghost"
              size="sm"
              className="ml-4"
              onClick={() => {
                setCrawlError(null);
                refreshJobs();
              }}
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Top Jobs Section */}
        <TopJobsSection
          jobs={topJobs}
          loading={loading}
          onMarkApplied={handleMarkApplied}
          onMarkNotInterested={handleMarkNotInterested}
          newJobIds={newJobIds}
        />

        {/* Company Jobs Section (Split View) */}
        <CompanyJobsSection
          companies={filteredCompanies}
          jobsByCompany={jobsByCompany}
          crawlLogs={crawlLogs}
          loading={loading}
          onCompanyClick={handleCompanyClick}
          onCompanyRefresh={handleCompanyRefresh}
          refreshingCompanyId={crawlingCompanyId}
          onMarkApplied={handleMarkApplied}
          onMarkNotInterested={handleMarkNotInterested}
          newJobIds={newJobIds}
          hasMore={hasMore}
          onLoadMore={loadMore}
          loadingMore={loadingMore}
        />

        {/* Confirm Dismiss Modal */}
        <ConfirmDismissModal
          isOpen={dismissModal.isOpen}
          onClose={handleCloseDismissModal}
          onConfirm={handleConfirmDismiss}
          jobTitle={dismissModal.job?.title || ''}
          companyName={dismissModal.job?.companyName || ''}
          loading={dismissModal.loading}
        />
      </div>
    </Layout>
  );
}
