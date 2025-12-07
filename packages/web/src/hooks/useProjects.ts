'use client';

import { useState, useEffect, useCallback } from 'react';
import { projects as projectsApi, Project, ApiError } from '@/lib/api';

interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await projectsApi.list();
      setProjects(response.projects);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch projects';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    refresh: fetchProjects,
  };
}
