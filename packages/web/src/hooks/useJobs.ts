'use client';

import { useState, useEffect, useCallback } from 'react';
import { jobs as jobsApi, JobListing, JobListingsFilter, ApiError } from '@/lib/api';

interface UseJobsOptions {
  initialFilters?: JobListingsFilter;
  autoFetch?: boolean;
}

interface UseJobsReturn {
  jobs: JobListing[];
  total: number;
  loading: boolean;
  error: string | null;
  filters: JobListingsFilter;
  setFilters: (filters: JobListingsFilter) => void;
  refresh: () => Promise<void>;
  markApplied: (id: number) => Promise<void>;
  markDismissed: (id: number) => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  loadingMore: boolean;
}

const LIMIT = 20;

export function useJobs(options: UseJobsOptions = {}): UseJobsReturn {
  const { initialFilters = {}, autoFetch = true } = options;

  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<JobListingsFilter>(initialFilters);
  const [offset, setOffset] = useState(0);

  const fetchJobs = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setOffset(0);
    }
    setError(null);

    try {
      const response = await jobsApi.listJobs({
        ...filters,
        limit: LIMIT,
        offset: isLoadMore ? offset : 0,
      });

      if (isLoadMore) {
        setJobs(prev => [...prev, ...response.listings]);
      } else {
        setJobs(response.listings);
      }
      setTotal(response.total);
      setOffset(isLoadMore ? offset + LIMIT : LIMIT);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch jobs';
      setError(message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, offset]);

  // Re-fetch when filters change
  useEffect(() => {
    if (autoFetch) {
      fetchJobs(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, autoFetch]);

  const markApplied = useCallback(async (id: number): Promise<void> => {
    await jobsApi.updateJobStatus(id, 'applied');
    setJobs(prev => prev.map(job =>
      job.id === id ? { ...job, status: 'applied' as const } : job
    ));
  }, []);

  const markDismissed = useCallback(async (id: number): Promise<void> => {
    await jobsApi.updateJobStatus(id, 'dismissed');
    setJobs(prev => prev.filter(job => job.id !== id));
    setTotal(prev => prev - 1);
  }, []);

  const loadMore = useCallback(async (): Promise<void> => {
    if (!loadingMore && jobs.length < total) {
      await fetchJobs(true);
    }
  }, [fetchJobs, loadingMore, jobs.length, total]);

  const refresh = useCallback(async (): Promise<void> => {
    await fetchJobs(false);
  }, [fetchJobs]);

  return {
    jobs,
    total,
    loading,
    error,
    filters,
    setFilters,
    refresh,
    markApplied,
    markDismissed,
    hasMore: jobs.length < total,
    loadMore,
    loadingMore,
  };
}
