'use client';

import { useState, useEffect, useCallback } from 'react';
import { actions as actionsApi, Action, ActionsFilter, ApiError } from '@/lib/api';

interface UseActionsOptions {
  initialFilters?: ActionsFilter;
  autoFetch?: boolean;
}

interface UseActionsReturn {
  actions: Action[];
  total: number;
  loading: boolean;
  error: string | null;
  filters: ActionsFilter;
  setFilters: (filters: ActionsFilter) => void;
  refresh: () => Promise<void>;
  createAction: (data: {
    title: string;
    project: string;
    labels?: string[];
    urgency: number;
    importance: number;
  }) => Promise<Action>;
  updateAction: (
    id: number,
    data: {
      title?: string;
      project?: string;
      labels?: string[];
      urgency?: number;
      importance?: number;
    }
  ) => Promise<Action>;
  updateActionOptimistic: (
    id: number,
    data: {
      urgency: number;
      importance: number;
    }
  ) => Promise<void>;
  deleteAction: (id: number) => Promise<void>;
  completeActions: (ids: number[]) => Promise<{
    completed: number[];
    notFound: number[];
    alreadyCompleted: number[];
  }>;
}

export function useActions(options: UseActionsOptions = {}): UseActionsReturn {
  const { initialFilters = { status: 'open' }, autoFetch = true } = options;

  const [actions, setActions] = useState<Action[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ActionsFilter>(initialFilters);

  const fetchActions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await actionsApi.list(filters);
      setActions(response.actions);
      setTotal(response.total);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to fetch actions';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (autoFetch) {
      fetchActions();
    }
  }, [fetchActions, autoFetch]);

  const createAction = async (data: {
    title: string;
    project: string;
    labels?: string[];
    urgency: number;
    importance: number;
  }): Promise<Action> => {
    const response = await actionsApi.create(data);
    await fetchActions();
    return response.action;
  };

  const updateAction = async (
    id: number,
    data: {
      title?: string;
      project?: string;
      labels?: string[];
      urgency?: number;
      importance?: number;
    }
  ): Promise<Action> => {
    const response = await actionsApi.update(id, data);
    await fetchActions();
    return response.action;
  };

  /**
   * Optimistically update an action's urgency/importance.
   * Updates UI immediately, then syncs with server.
   * Rolls back on error.
   */
  const updateActionOptimistic = async (
    id: number,
    data: { urgency: number; importance: number }
  ): Promise<void> => {
    // Store original state for rollback
    const originalActions = [...actions];

    // Optimistically update local state
    setActions((prev) =>
      prev.map((action) =>
        action.id === id
          ? {
              ...action,
              urgency: data.urgency,
              importance: data.importance,
              priorityScore: data.urgency * data.importance,
            }
          : action
      )
    );

    try {
      // Sync with server
      await actionsApi.update(id, data);
    } catch (err) {
      // Rollback on error
      setActions(originalActions);
      const message = err instanceof ApiError ? err.message : 'Failed to update action';
      setError(message);
      throw err;
    }
  };

  const deleteAction = async (id: number): Promise<void> => {
    await actionsApi.delete(id);
    await fetchActions();
  };

  const completeActions = async (ids: number[]) => {
    const result = await actionsApi.complete(ids);
    await fetchActions();
    return result;
  };

  return {
    actions,
    total,
    loading,
    error,
    filters,
    setFilters,
    refresh: fetchActions,
    createAction,
    updateAction,
    updateActionOptimistic,
    deleteAction,
    completeActions,
  };
}
