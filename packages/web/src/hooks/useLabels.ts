'use client';

import { useState, useEffect, useCallback } from 'react';
import { labels as labelsApi, Label, ApiError } from '@/lib/api';

interface UseLabelsReturn {
  labels: Label[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useLabels(): UseLabelsReturn {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLabels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await labelsApi.list();
      setLabels(response.labels);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch labels';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  return {
    labels,
    loading,
    error,
    refresh: fetchLabels,
  };
}
