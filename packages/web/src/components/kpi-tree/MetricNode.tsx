'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Lock } from 'lucide-react';
import { formatValue, getChangeColorClass } from '@/lib/kpi-tree/formatting';
import { TrendIndicator } from './TrendIndicator';
import type { KpiTreeNode } from '@/lib/kpi-tree/types';

interface MetricNodeProps {
  node: KpiTreeNode;
  isDisabled?: boolean;
  onPercentChange?: (metricKey: string, value: number | null) => void;
  onHover?: (metricKey: string | null) => void;
  theme?: 'dark' | 'light';
}

/**
 * Layer color mapping for dark theme
 */
const DARK_LAYER_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  1: {
    bg: 'bg-[#2d3a5c]',
    border: 'border-blue-400/50',
    text: 'text-blue-200',
  },
  2: {
    bg: 'bg-[#3d2d5c]',
    border: 'border-purple-400/50',
    text: 'text-purple-200',
  },
  3: {
    bg: 'bg-[#2d5c4a]',
    border: 'border-teal-400/50',
    text: 'text-teal-200',
  },
  4: {
    bg: 'bg-[#5c4a2d]',
    border: 'border-amber-400/50',
    text: 'text-amber-200',
  },
  5: {
    bg: 'bg-[#5c2d3a]',
    border: 'border-rose-400/50',
    text: 'text-rose-200',
  },
};

/**
 * Layer color mapping for light theme
 */
const LIGHT_LAYER_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  1: {
    bg: 'bg-blue-100',
    border: 'border-blue-400',
    text: 'text-blue-800',
  },
  2: {
    bg: 'bg-purple-100',
    border: 'border-purple-400',
    text: 'text-purple-800',
  },
  3: {
    bg: 'bg-teal-100',
    border: 'border-teal-400',
    text: 'text-teal-800',
  },
  4: {
    bg: 'bg-amber-100',
    border: 'border-amber-400',
    text: 'text-amber-800',
  },
  5: {
    bg: 'bg-rose-100',
    border: 'border-rose-400',
    text: 'text-rose-800',
  },
};

export function MetricNode({
  node,
  isDisabled = false,
  onPercentChange,
  onHover,
  theme = 'dark',
}: MetricNodeProps) {
  const [inputValue, setInputValue] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input with external percent change
  useEffect(() => {
    if (node.percentChange !== undefined && node.percentChange !== 0) {
      setInputValue(node.percentChange.toString());
    } else {
      setInputValue('');
    }
  }, [node.percentChange]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty, negative, and decimal values
    if (value === '' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
      setInputValue(value);
    }
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    commitChange();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      commitChange();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      // Reset to original value
      if (node.percentChange !== undefined && node.percentChange !== 0) {
        setInputValue(node.percentChange.toString());
      } else {
        setInputValue('');
      }
    }
  };

  const commitChange = () => {
    if (!onPercentChange) return;

    const numValue = parseFloat(inputValue);
    if (inputValue === '' || isNaN(numValue)) {
      onPercentChange(node.key, null);
    } else {
      onPercentChange(node.key, numValue);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputValue('');
    if (onPercentChange) {
      onPercentChange(node.key, null);
    }
  };

  const startEditing = () => {
    if (!isDisabled && node.layer !== 1) {
      setIsEditing(true);
    }
  };

  const handleMouseEnter = () => {
    if (onHover) {
      onHover(node.key);
    }
  };

  const handleMouseLeave = () => {
    if (onHover) {
      onHover(null);
    }
  };

  const LAYER_COLORS = theme === 'dark' ? DARK_LAYER_COLORS : LIGHT_LAYER_COLORS;
  const defaultColors = theme === 'dark'
    ? { bg: 'bg-[#5c2d3a]', border: 'border-rose-400/50', text: 'text-rose-200' }
    : { bg: 'bg-rose-100', border: 'border-rose-400', text: 'text-rose-800' };
  const colors = LAYER_COLORS[node.layer] ?? defaultColors;
  const formattedValue = formatValue(node.value, node.unit);

  // Theme-specific text colors
  const valueTextColor = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const mutedTextColor = theme === 'dark' ? 'text-[#94a3b8]' : 'text-gray-500';
  const inputBgColor = theme === 'dark' ? 'bg-[#1a1a2e]' : 'bg-white';
  const inputBorderColor = theme === 'dark' ? 'border-[#374151]' : 'border-gray-300';
  const badgeBgColor = theme === 'dark' ? 'bg-[#1a1a2e]' : 'bg-white';

  // Aspirational value display
  const hasAspirations =
    node.aspirationalValue !== undefined &&
    node.aspirationalValue !== null &&
    node.aspirationalValue !== node.value;

  const aspirationalFormatted = hasAspirations
    ? formatValue(node.aspirationalValue!, node.unit)
    : null;

  // Percent change badge
  const changeColorClass =
    node.percentChange !== undefined
      ? getChangeColorClass(node.percentChange, node.favorable)
      : '';

  return (
    <div
      className={`
        relative
        rounded-lg
        border-2
        ${colors.bg}
        ${colors.border}
        p-3
        w-[160px]
        h-[120px]
        overflow-hidden
        transition-all
        duration-200
        ${isDisabled ? 'opacity-50' : 'hover:scale-105 hover:z-10'}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Metric Name */}
      <div className={`text-xs font-medium ${colors.text} mb-1 leading-tight line-clamp-2`}>
        {node.name}
      </div>

      {/* Value Display */}
      <div className="flex flex-col">
        {/* Actual Value */}
        <div
          className={`
            font-bold ${valueTextColor}
            ${hasAspirations ? 'line-through opacity-60 text-sm' : 'text-lg'}
          `}
        >
          {formattedValue}
        </div>

        {/* Aspirational Value (if different) */}
        {hasAspirations && (
          <div className={`text-lg font-bold ${valueTextColor}`}>{aspirationalFormatted}</div>
        )}
      </div>

      {/* Percent Change Input (hidden for Layer 1) */}
      {node.layer !== 1 && !isDisabled && onPercentChange && (
        <div className="mt-1 flex items-center gap-1">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                className={`w-12 px-1 py-0.5 text-xs ${inputBgColor} border ${inputBorderColor} rounded ${valueTextColor} text-center focus:outline-none focus:border-blue-400`}
                placeholder="0"
              />
              <span className={`text-xs ${mutedTextColor}`}>%</span>
            </div>
          ) : (
            <button
              onClick={startEditing}
              className={`text-xs ${mutedTextColor} hover:${valueTextColor} transition-colors flex items-center gap-1`}
            >
              {inputValue ? (
                <>
                  <span className={changeColorClass}>
                    {parseFloat(inputValue) > 0 ? '+' : ''}
                    {inputValue}%
                  </span>
                  <button
                    onClick={handleClear}
                    className="hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <span className="opacity-50 hover:opacity-100">Set % change</span>
              )}
            </button>
          )}
        </div>
      )}

      {/* Percent Change Badge */}
      {node.percentChange !== undefined && node.percentChange !== 0 && (
        <div
          className={`
            absolute
            -top-2
            -right-2
            px-1.5
            py-0.5
            rounded-full
            text-xs
            font-medium
            ${badgeBgColor}
            ${changeColorClass}
            border ${inputBorderColor}
          `}
        >
          {node.percentChange > 0 ? '+' : ''}
          {node.percentChange.toFixed(1)}%
        </div>
      )}

      {/* Trend Indicator (bottom-right) */}
      {node.trendDirection && (
        <div className="absolute bottom-1 right-1">
          <TrendIndicator
            direction={node.trendDirection}
            percent={node.trendPercent ?? null}
            favorable={node.favorable}
            size="sm"
          />
        </div>
      )}

      {/* Disabled Lock Icon */}
      {isDisabled && (
        <div className={`absolute top-1 right-1 ${mutedTextColor}`} title="Calculated from parent">
          <Lock className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}
