'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TrendDirection, FavorableDirection } from '@/lib/kpi-tree/types';

interface TrendIndicatorProps {
  direction: TrendDirection | null;
  percent: number | null;
  favorable: FavorableDirection;
  size?: 'sm' | 'md';
}

export function TrendIndicator({
  direction,
  percent,
  favorable,
  size = 'sm',
}: TrendIndicatorProps) {
  if (direction === null || percent === null) {
    return null;
  }

  // Determine if this trend is favorable
  const isFavorable =
    (direction === 'up' && favorable === 'up') ||
    (direction === 'down' && favorable === 'down');

  const isUnfavorable =
    (direction === 'up' && favorable === 'down') ||
    (direction === 'down' && favorable === 'up');

  // Color classes
  const colorClass = isFavorable
    ? 'text-green-400'
    : isUnfavorable
      ? 'text-red-400'
      : 'text-[#94a3b8]';

  // Icon size
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  // Icon component
  const Icon =
    direction === 'up'
      ? TrendingUp
      : direction === 'down'
        ? TrendingDown
        : Minus;

  return (
    <div className={`flex items-center gap-0.5 ${colorClass}`}>
      <Icon className={iconSize} />
      <span className={`font-medium ${textSize}`}>
        {Math.abs(percent).toFixed(1)}%
      </span>
    </div>
  );
}
