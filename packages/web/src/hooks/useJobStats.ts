'use client';

import { useState, useEffect, useCallback } from 'react';
import { jobs as jobsApi, JobStats, ApiError } from '@/lib/api';

interface UseJobStatsReturn {
  stats: JobStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useJobStats(): UseJobStatsReturn {
  const [stats, setStats] = useState<JobStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await jobsApi.getStats();
      setStats(response);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch job statistics';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refresh: fetchStats,
  };
}
