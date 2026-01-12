/**
 * KPI Tree API Client
 * Functions for fetching KPI tree data from the API
 */

import type {
  KpiPeriod,
  KpiMetric,
  KpiMetricWithComparison,
  PeriodsResponse,
  MetricsResponse,
  MetricsCompareResponse,
  CurrentPeriodResponse,
} from './types';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001/api/v1';

class ApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!data.success || !response.ok) {
    throw new ApiError(
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message || 'An unknown error occurred'
    );
  }

  return data.data as T;
}

/**
 * Fetch all periods
 */
export async function fetchPeriods(): Promise<KpiPeriod[]> {
  const data = await request<{ periods: KpiPeriod[] }>('/kpi-tree/periods');
  return data.periods;
}

/**
 * Fetch the current period
 */
export async function fetchCurrentPeriod(): Promise<KpiPeriod | null> {
  const data = await request<{ period: KpiPeriod | null }>('/kpi-tree/periods/current');
  return data.period;
}

/**
 * Fetch a single period by ID
 */
export async function fetchPeriod(periodId: number): Promise<KpiPeriod> {
  const data = await request<{ period: KpiPeriod }>(`/kpi-tree/periods/${periodId}`);
  return data.period;
}

/**
 * Fetch metrics for a specific period
 */
export async function fetchMetrics(periodId: number): Promise<KpiMetric[]> {
  const data = await request<{ metrics: KpiMetric[] }>(`/kpi-tree/metrics?periodId=${periodId}`);
  return data.metrics;
}

/**
 * Fetch metrics with comparison to a baseline period
 */
export async function fetchMetricsCompare(
  periodId: number,
  baselinePeriodId: number
): Promise<KpiMetricWithComparison[]> {
  const data = await request<{ metrics: KpiMetricWithComparison[] }>(
    `/kpi-tree/metrics/compare?periodId=${periodId}&baselinePeriodId=${baselinePeriodId}`
  );
  return data.metrics;
}

export { ApiError };
