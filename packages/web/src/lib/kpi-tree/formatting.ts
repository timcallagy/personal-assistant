/**
 * KPI Tree Formatting Utilities
 * Functions for formatting metric values for display
 */

import type { MetricUnit, FavorableDirection } from './types';

/**
 * Format a value based on its unit type
 * @param value The numeric value to format
 * @param unit The unit type
 * @returns Formatted string
 */
export function formatValue(value: number | null, unit: MetricUnit): string {
  if (value === null || value === undefined) {
    return '-';
  }

  switch (unit) {
    case 'percent':
      return `${value.toFixed(1)}%`;

    case 'currency':
      return formatAbbreviatedCurrency(value);

    case 'ratio':
      return value.toFixed(1);

    case 'count':
      return Math.round(value).toLocaleString();

    case 'hours':
      return `${Math.round(value).toLocaleString()}h`;

    case 'days':
      return `${Math.round(value).toLocaleString()}d`;

    default:
      return value.toString();
  }
}

/**
 * Format currency with abbreviation (K, M, B)
 * Uses Euro symbol
 * @param value The numeric value
 * @returns Formatted currency string
 */
export function formatAbbreviatedCurrency(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000_000) {
    return `${sign}€${(absValue / 1_000_000_000).toFixed(1)}B`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}€${(absValue / 1_000_000).toFixed(1)}M`;
  }
  if (absValue >= 10_000) {
    return `${sign}€${(absValue / 1_000).toFixed(0)}K`;
  }
  return `${sign}€${absValue.toLocaleString()}`;
}

/**
 * Format a percent change value
 * @param value The percent change value
 * @returns Formatted string with + or - prefix
 */
export function formatPercentChange(value: number | null): string {
  if (value === null || value === undefined) {
    return '-';
  }

  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

/**
 * Determine if a change is favorable based on direction and value
 * @param change The percent change value
 * @param favorable The favorable direction ('up' or 'down')
 * @returns true if the change is favorable, false if unfavorable, null if neutral
 */
export function isChangeFavorable(
  change: number | null,
  favorable: FavorableDirection
): boolean | null {
  if (change === null || change === undefined || Math.abs(change) < 0.5) {
    return null; // Neutral
  }

  if (favorable === 'up') {
    return change > 0;
  } else {
    return change < 0;
  }
}

/**
 * Get CSS color class for a change based on favorability
 * @param change The percent change value
 * @param favorable The favorable direction
 * @returns CSS color class string
 */
export function getChangeColorClass(
  change: number | null,
  favorable: FavorableDirection
): string {
  const isFavorable = isChangeFavorable(change, favorable);

  if (isFavorable === null) {
    return 'text-[#94a3b8]'; // Neutral gray
  }

  return isFavorable ? 'text-green-400' : 'text-red-400';
}

/**
 * Format a value for display with optional aspirational comparison
 * @param actual The actual value
 * @param aspirational The aspirational value (if different from actual)
 * @param unit The unit type
 * @returns Object with formatted values
 */
export function formatValueWithAspirations(
  actual: number | null,
  aspirational: number | null | undefined,
  unit: MetricUnit
): { actualFormatted: string; aspirationalFormatted: string | null; hasChange: boolean } {
  const actualFormatted = formatValue(actual, unit);

  if (aspirational === null || aspirational === undefined || aspirational === actual) {
    return {
      actualFormatted,
      aspirationalFormatted: null,
      hasChange: false,
    };
  }

  return {
    actualFormatted,
    aspirationalFormatted: formatValue(aspirational, unit),
    hasChange: true,
  };
}
