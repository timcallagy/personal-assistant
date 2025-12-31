'use client';

import { useState, useEffect, useCallback } from 'react';
import { jobs as jobsApi, JobProfile, ApiError } from '@/lib/api';

interface UseJobProfileReturn {
  profile: JobProfile | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  saveError: string | null;
  refresh: () => Promise<void>;
  updateProfile: (data: Partial<Omit<JobProfile, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
}

export function useJobProfile(): UseJobProfileReturn {
  const [profile, setProfile] = useState<JobProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await jobsApi.getProfile();
      setProfile(response.profile);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch job profile';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (
    data: Partial<Omit<JobProfile, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> => {
    setSaving(true);
    setSaveError(null);
    try {
      const response = await jobsApi.updateProfile(data);
      setProfile(response.profile);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to save job profile';
      setSaveError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    profile,
    loading,
    error,
    saving,
    saveError,
    refresh: fetchProfile,
    updateProfile,
  };
}
