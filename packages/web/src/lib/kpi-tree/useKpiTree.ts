'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { KpiPeriod, KpiMetric, KpiTreeNode, AspirationalChanges, TreeLayout } from './types';
import { fetchPeriods, fetchCurrentPeriod, fetchMetrics, fetchMetricsCompare } from './api';
import { buildTree } from './treeUtils';
import { calculateAspirationalValues, getDisabledMetrics, clearDescendantChanges } from './calculations';
import {
  loadState,
  saveAspirationalChanges,
  savePeriodId,
  saveBaselinePeriodId,
  saveLayout,
  saveTheme,
  clearAspirationalChanges,
  type Theme,
} from './storage';

interface UseKpiTreeState {
  // Data
  periods: KpiPeriod[];
  tree: KpiTreeNode | null;
  currentPeriod: KpiPeriod | null;

  // Computed tree (with aspirational values applied)
  computedTree: KpiTreeNode | null;
  disabledMetrics: Set<string>;

  // Selected period IDs
  periodId: number | null;
  baselinePeriodId: number | null;

  // Loading states
  isLoadingPeriods: boolean;
  isLoadingMetrics: boolean;

  // Error states
  periodsError: string | null;
  metricsError: string | null;

  // Aspirational changes
  aspirationalChanges: AspirationalChanges;

  // Layout
  layout: TreeLayout;

  // Theme
  theme: Theme;
}

interface UseKpiTreeReturn extends UseKpiTreeState {
  // Actions
  setPeriodId: (id: number | null) => void;
  setBaselinePeriodId: (id: number | null) => void;
  setPercentChange: (metricKey: string, value: number | null) => void;
  setLayout: (layout: TreeLayout) => void;
  setTheme: (theme: Theme) => void;
  resetAll: () => void;
  refetch: () => Promise<void>;
}

export function useKpiTree(): UseKpiTreeReturn {
  // Load initial state from localStorage
  const [initialStateLoaded, setInitialStateLoaded] = useState(false);
  const [storedState] = useState(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return { periodId: null, baselinePeriodId: null, aspirationalChanges: {}, layout: 'horizontal-rtl' as TreeLayout, theme: 'dark' as Theme };
    }
    return loadState();
  });

  // Data state
  const [periods, setPeriods] = useState<KpiPeriod[]>([]);
  const [metrics, setMetrics] = useState<KpiMetric[]>([]);
  const [tree, setTree] = useState<KpiTreeNode | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<KpiPeriod | null>(null);

  // Selection state (initialized from localStorage)
  const [periodId, setPeriodIdState] = useState<number | null>(storedState.periodId);
  const [baselinePeriodId, setBaselinePeriodIdState] = useState<number | null>(storedState.baselinePeriodId);

  // Loading state
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(true);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  // Error state
  const [periodsError, setPeriodsError] = useState<string | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // Aspirational changes (initialized from localStorage)
  const [aspirationalChanges, setAspirationalChanges] = useState<AspirationalChanges>(
    storedState.aspirationalChanges
  );

  // Layout (initialized from localStorage)
  const [layout, setLayoutState] = useState<TreeLayout>(storedState.layout);

  // Theme (initialized from localStorage)
  const [theme, setThemeState] = useState<Theme>(storedState.theme);

  // Fetch periods on mount
  useEffect(() => {
    async function loadPeriods() {
      setIsLoadingPeriods(true);
      setPeriodsError(null);

      try {
        const [periodsData, currentPeriodData] = await Promise.all([
          fetchPeriods(),
          fetchCurrentPeriod(),
        ]);

        setPeriods(periodsData);
        setCurrentPeriod(currentPeriodData);

        // Validate stored periodId exists in fetched periods
        if (storedState.periodId) {
          const storedPeriodExists = periodsData.some((p) => p.id === storedState.periodId);
          if (!storedPeriodExists && currentPeriodData) {
            // Invalid stored period, use current
            setPeriodIdState(currentPeriodData.id);
            savePeriodId(currentPeriodData.id);
          }
        } else if (currentPeriodData) {
          // No stored period, use current
          setPeriodIdState(currentPeriodData.id);
        }

        setInitialStateLoaded(true);
      } catch (error) {
        console.error('Failed to fetch periods:', error);
        setPeriodsError(error instanceof Error ? error.message : 'Failed to load periods');
      } finally {
        setIsLoadingPeriods(false);
      }
    }

    loadPeriods();
  }, [storedState.periodId]);

  // Fetch metrics when period changes
  useEffect(() => {
    if (!periodId) {
      setTree(null);
      return;
    }

    async function loadMetrics() {
      setIsLoadingMetrics(true);
      setMetricsError(null);

      try {
        let metricsData: KpiMetric[];

        // periodId is guaranteed non-null here due to early return check above
        if (baselinePeriodId && baselinePeriodId !== periodId) {
          // Fetch with comparison
          metricsData = await fetchMetricsCompare(periodId!, baselinePeriodId);
        } else {
          // Fetch without comparison
          metricsData = await fetchMetrics(periodId!);
        }

        setMetrics(metricsData);

        // TEMPORARY: Filter out Layer 5 for legibility experiment
        const filteredMetrics = metricsData.filter((m) => m.layer !== 5);

        // Build tree from metrics
        const treeData = buildTree(filteredMetrics);
        setTree(treeData);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
        setMetricsError(error instanceof Error ? error.message : 'Failed to load metrics');
        setTree(null);
      } finally {
        setIsLoadingMetrics(false);
      }
    }

    loadMetrics();
  }, [periodId, baselinePeriodId]);

  // Set period ID (and save to localStorage)
  const setPeriodId = useCallback((id: number | null) => {
    setPeriodIdState(id);
    savePeriodId(id);
  }, []);

  // Set baseline period ID (and save to localStorage)
  const setBaselinePeriodId = useCallback((id: number | null) => {
    setBaselinePeriodIdState(id);
    saveBaselinePeriodId(id);
  }, []);

  // Set percent change for a metric (and save to localStorage)
  const setPercentChange = useCallback((metricKey: string, value: number | null) => {
    setAspirationalChanges((prev) => {
      let newChanges: AspirationalChanges;

      if (value === null || value === 0) {
        // Remove the change
        newChanges = { ...prev };
        delete newChanges[metricKey];
      } else {
        // Clear descendant changes when setting a parent
        let cleanedChanges = prev;
        if (tree) {
          cleanedChanges = clearDescendantChanges(prev, tree, metricKey);
        }

        newChanges = {
          ...cleanedChanges,
          [metricKey]: value,
        };
      }

      // Save to localStorage
      saveAspirationalChanges(newChanges);
      return newChanges;
    });
  }, [tree]);

  // Compute the tree with aspirational values
  const computedTree = useMemo(() => {
    if (!tree || Object.keys(aspirationalChanges).length === 0) {
      return tree;
    }
    return calculateAspirationalValues(tree, aspirationalChanges);
  }, [tree, aspirationalChanges]);

  // Compute disabled metrics
  const disabledMetrics = useMemo(() => {
    if (!tree) return new Set<string>();
    return getDisabledMetrics(tree, aspirationalChanges);
  }, [tree, aspirationalChanges]);

  // Set layout (and save to localStorage)
  const setLayout = useCallback((newLayout: TreeLayout) => {
    setLayoutState(newLayout);
    saveLayout(newLayout);
  }, []);

  // Set theme (and save to localStorage)
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    saveTheme(newTheme);
  }, []);

  // Reset all aspirational changes (and clear from localStorage)
  const resetAll = useCallback(() => {
    setAspirationalChanges({});
    clearAspirationalChanges();
  }, []);

  // Refetch data
  const refetch = useCallback(async () => {
    if (!periodId) return;

    setIsLoadingMetrics(true);
    setMetricsError(null);

    try {
      let metricsData: KpiMetric[];

      // periodId is guaranteed non-null here due to early return check above
      if (baselinePeriodId && baselinePeriodId !== periodId) {
        metricsData = await fetchMetricsCompare(periodId!, baselinePeriodId);
      } else {
        metricsData = await fetchMetrics(periodId!);
      }

      setMetrics(metricsData);
      const treeData = buildTree(metricsData);
      setTree(treeData);
    } catch (error) {
      console.error('Failed to refetch metrics:', error);
      setMetricsError(error instanceof Error ? error.message : 'Failed to load metrics');
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [periodId, baselinePeriodId]);

  return {
    // Data
    periods,
    tree,
    currentPeriod,

    // Computed
    computedTree,
    disabledMetrics,

    // Selection
    periodId,
    baselinePeriodId,

    // Loading
    isLoadingPeriods,
    isLoadingMetrics,

    // Errors
    periodsError,
    metricsError,

    // Aspirational
    aspirationalChanges,

    // Layout
    layout,

    // Theme
    theme,

    // Actions
    setPeriodId,
    setBaselinePeriodId,
    setPercentChange,
    setLayout,
    setTheme,
    resetAll,
    refetch,
  };
}
