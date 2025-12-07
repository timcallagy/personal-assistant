'use client';

import { useState, useEffect, useCallback } from 'react';
import { notes, actions, Note, Action, ApiError } from '@/lib/api';

interface DashboardStats {
  notesCount: number;
  openActionsCount: number;
  completedActionsCount: number;
  recentNotes: Note[];
  topActions: Action[];
}

interface UseDashboardReturn {
  stats: DashboardStats;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboard(): UseDashboardReturn {
  const [stats, setStats] = useState<DashboardStats>({
    notesCount: 0,
    openActionsCount: 0,
    completedActionsCount: 0,
    recentNotes: [],
    topActions: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [notesRes, openActionsRes, completedActionsRes] = await Promise.all([
        notes.list({ limit: 5 }),
        actions.list({ status: 'open', top: 5 }),
        actions.completed({ limit: 1 }),
      ]);

      setStats({
        notesCount: notesRes.total,
        openActionsCount: openActionsRes.total,
        completedActionsCount: completedActionsRes.total,
        recentNotes: notesRes.notes,
        topActions: openActionsRes.actions,
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch dashboard';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    stats,
    loading,
    error,
    refresh: fetchDashboard,
  };
}
