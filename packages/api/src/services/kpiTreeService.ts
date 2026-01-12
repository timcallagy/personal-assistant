/**
 * KPI Tree Service
 * Handles all KPI tree data operations
 */

import { prisma, notFoundError } from '../lib/index.js';

// Response types
export interface KpiPeriodResponse {
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

export interface KpiMetricResponse {
  key: string;
  name: string;
  layer: number;
  parentKey: string | null;
  unit: 'percent' | 'currency' | 'ratio' | 'count' | 'hours';
  favorable: 'up' | 'down';
  formula: string | null;
  sortOrder: number;
  value: number | null;
}

export interface KpiMetricCompareResponse extends KpiMetricResponse {
  baselineValue: number | null;
  trendDirection: 'up' | 'down' | 'flat' | null;
  trendPercent: number | null;
}

/**
 * Get all periods
 */
export async function getPeriods(): Promise<KpiPeriodResponse[]> {
  const periods = await prisma.kpiPeriod.findMany({
    orderBy: [
      { year: 'desc' },
      { month: 'desc' },
      { quarter: 'desc' },
    ],
  });

  return periods.map((p) => ({
    id: p.id,
    type: p.type as 'monthly' | 'quarterly',
    year: p.year,
    month: p.month,
    quarter: p.quarter,
    label: p.label,
    startDate: p.startDate.toISOString(),
    endDate: p.endDate.toISOString(),
    isCurrent: p.isCurrent,
  }));
}

/**
 * Get a single period by ID
 */
export async function getPeriod(periodId: number): Promise<KpiPeriodResponse> {
  const period = await prisma.kpiPeriod.findUnique({
    where: { id: periodId },
  });

  if (!period) {
    throw notFoundError('Period', periodId);
  }

  return {
    id: period.id,
    type: period.type as 'monthly' | 'quarterly',
    year: period.year,
    month: period.month,
    quarter: period.quarter,
    label: period.label,
    startDate: period.startDate.toISOString(),
    endDate: period.endDate.toISOString(),
    isCurrent: period.isCurrent,
  };
}

/**
 * Get metrics with values for a specific period
 */
export async function getMetrics(periodId: number): Promise<KpiMetricResponse[]> {
  // Verify period exists
  const period = await prisma.kpiPeriod.findUnique({
    where: { id: periodId },
  });

  if (!period) {
    throw notFoundError('Period', periodId);
  }

  // Get all metrics with their values for this period
  const metrics = await prisma.kpiMetric.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      values: {
        where: { periodId },
        take: 1,
      },
    },
  });

  return metrics.map((m) => ({
    key: m.key,
    name: m.name,
    layer: m.layer,
    parentKey: m.parentKey,
    unit: m.unit as 'percent' | 'currency' | 'ratio' | 'count' | 'hours',
    favorable: m.favorable as 'up' | 'down',
    formula: m.formula,
    sortOrder: m.sortOrder,
    value: m.values[0]?.value ?? null,
  }));
}

/**
 * Get metrics with comparison to a baseline period
 */
export async function getMetricsCompare(
  periodId: number,
  baselinePeriodId: number
): Promise<KpiMetricCompareResponse[]> {
  // Verify both periods exist
  const [period, baselinePeriod] = await Promise.all([
    prisma.kpiPeriod.findUnique({ where: { id: periodId } }),
    prisma.kpiPeriod.findUnique({ where: { id: baselinePeriodId } }),
  ]);

  if (!period) {
    throw notFoundError('Period', periodId);
  }
  if (!baselinePeriod) {
    throw notFoundError('Baseline Period', baselinePeriodId);
  }

  // Get all metrics with values for both periods
  const metrics = await prisma.kpiMetric.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      values: {
        where: {
          periodId: { in: [periodId, baselinePeriodId] },
        },
      },
    },
  });

  return metrics.map((m) => {
    const currentValue = m.values.find((v) => v.periodId === periodId)?.value ?? null;
    const baselineValue = m.values.find((v) => v.periodId === baselinePeriodId)?.value ?? null;

    let trendDirection: 'up' | 'down' | 'flat' | null = null;
    let trendPercent: number | null = null;

    if (currentValue !== null && baselineValue !== null && baselineValue !== 0) {
      const change = ((currentValue - baselineValue) / Math.abs(baselineValue)) * 100;
      trendPercent = Math.round(change * 10) / 10; // 1 decimal place

      if (Math.abs(change) < 0.5) {
        trendDirection = 'flat';
      } else if (change > 0) {
        trendDirection = 'up';
      } else {
        trendDirection = 'down';
      }
    }

    return {
      key: m.key,
      name: m.name,
      layer: m.layer,
      parentKey: m.parentKey,
      unit: m.unit as 'percent' | 'currency' | 'ratio' | 'count' | 'hours',
      favorable: m.favorable as 'up' | 'down',
      formula: m.formula,
      sortOrder: m.sortOrder,
      value: currentValue,
      baselineValue,
      trendDirection,
      trendPercent,
    };
  });
}

/**
 * Get the current period
 */
export async function getCurrentPeriod(): Promise<KpiPeriodResponse | null> {
  const period = await prisma.kpiPeriod.findFirst({
    where: { isCurrent: true },
  });

  if (!period) {
    return null;
  }

  return {
    id: period.id,
    type: period.type as 'monthly' | 'quarterly',
    year: period.year,
    month: period.month,
    quarter: period.quarter,
    label: period.label,
    startDate: period.startDate.toISOString(),
    endDate: period.endDate.toISOString(),
    isCurrent: period.isCurrent,
  };
}
