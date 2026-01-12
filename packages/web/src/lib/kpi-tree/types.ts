/**
 * KPI Tree Types
 * TypeScript interfaces for the KPI Driver Tree visualization
 */

// Period types
export interface KpiPeriod {
  id: number;
  type: 'monthly' | 'quarterly';
  year: number;
  month: number | null;
  quarter: number | null;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

// Metric unit types
export type MetricUnit = 'percent' | 'currency' | 'ratio' | 'count' | 'hours';

// Favorable direction
export type FavorableDirection = 'up' | 'down';

// Trend direction
export type TrendDirection = 'up' | 'down' | 'flat';

// Base metric from API
export interface KpiMetric {
  key: string;
  name: string;
  layer: number;
  parentKey: string | null;
  unit: MetricUnit;
  favorable: FavorableDirection;
  formula: string | null;
  sortOrder: number;
  value: number | null;
}

// Metric with comparison data
export interface KpiMetricWithComparison extends KpiMetric {
  baselineValue: number | null;
  trendDirection: TrendDirection | null;
  trendPercent: number | null;
}

// Tree node representation (extends metric with children)
export interface KpiTreeNode extends KpiMetric {
  children: KpiTreeNode[];
  // Aspirational values (calculated from user inputs)
  aspirationalValue?: number;
  percentChange?: number;
  // Comparison data
  baselineValue?: number | null;
  trendDirection?: TrendDirection | null;
  trendPercent?: number | null;
  // UI state
  isDisabled?: boolean;
}

// User's aspirational changes (stored in localStorage)
export interface AspirationalChanges {
  [metricKey: string]: number; // percent change values
}

// Layout type for the tree visualization
export type TreeLayout = 'vertical' | 'horizontal-ltr' | 'horizontal-rtl';

// Stored state for localStorage persistence
export interface StoredState {
  periodId: number | null;
  baselinePeriodId: number | null;
  aspirationalChanges: AspirationalChanges;
  layout: TreeLayout;
}

// API response types
export interface PeriodsResponse {
  success: boolean;
  data: {
    periods: KpiPeriod[];
  };
}

export interface MetricsResponse {
  success: boolean;
  data: {
    metrics: KpiMetric[];
  };
}

export interface MetricsCompareResponse {
  success: boolean;
  data: {
    metrics: KpiMetricWithComparison[];
  };
}

export interface CurrentPeriodResponse {
  success: boolean;
  data: {
    period: KpiPeriod | null;
  };
}
