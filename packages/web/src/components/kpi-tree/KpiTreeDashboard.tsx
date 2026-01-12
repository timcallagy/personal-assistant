'use client';

import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { MobileMessage } from './MobileMessage';
import { VerticalTree } from './VerticalTree';
import { HorizontalTree } from './HorizontalTree';
import { PeriodSelector } from './PeriodSelector';
import { LayoutToggle } from './LayoutToggle';
import { useKpiTree } from '@/lib/kpi-tree/useKpiTree';

const MIN_WIDTH = 1024;

export function KpiTreeDashboard() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [isViewportLoading, setIsViewportLoading] = useState(true);

  const {
    tree,
    computedTree,
    periods,
    currentPeriod,
    periodId,
    baselinePeriodId,
    isLoadingPeriods,
    isLoadingMetrics,
    periodsError,
    metricsError,
    aspirationalChanges,
    layout,
    setPercentChange,
    setPeriodId,
    setBaselinePeriodId,
    setLayout,
    resetAll,
  } = useKpiTree();

  // Check if there are any aspirational changes
  const hasChanges = Object.keys(aspirationalChanges).length > 0;

  // Use computed tree if available, otherwise use base tree
  const displayTree = computedTree || tree;

  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < MIN_WIDTH);
    };

    // Initial check
    checkViewport();
    setIsViewportLoading(false);

    // Listen for resize
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // Show nothing during SSR/initial load to prevent flash
  if (isViewportLoading || isMobile === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[#94a3b8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show mobile message for small viewports
  if (isMobile) {
    return <MobileMessage />;
  }

  // Get current period label
  const selectedPeriod = periods.find((p) => p.id === periodId);
  const periodLabel = selectedPeriod?.label || currentPeriod?.label || 'Loading...';

  // Combined loading state
  const isLoading = isLoadingPeriods || isLoadingMetrics;

  // Combined error state
  const error = periodsError || metricsError;

  // Render the appropriate tree layout
  const renderTree = () => {
    if (!displayTree) return null;

    const treeProps = {
      tree: displayTree,
      aspirationalChanges,
      onPercentChange: setPercentChange,
    };

    switch (layout) {
      case 'horizontal-ltr':
        return <HorizontalTree {...treeProps} direction="ltr" />;
      case 'horizontal-rtl':
        return <HorizontalTree {...treeProps} direction="rtl" />;
      case 'vertical':
      default:
        return <VerticalTree {...treeProps} />;
    }
  };

  // Get layout label for footer
  const layoutLabel = {
    'vertical': 'Top-Down',
    'horizontal-ltr': 'Left-Right',
    'horizontal-rtl': 'Right-Left',
  }[layout] || 'Top-Down';

  return (
    <div className="p-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              KPI Driver Tree
            </h1>
            <p className="text-[#94a3b8]">
              Professional Services Gross Margin Analysis
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-end gap-4">
            {/* Layout Toggle */}
            <LayoutToggle layout={layout} onLayoutChange={setLayout} />

            {/* Period Selector */}
            <div className="w-40">
              <PeriodSelector
                periods={periods}
                selectedId={periodId}
                onSelect={setPeriodId}
                label="Viewing Period"
              />
            </div>

            {/* Baseline Period Selector */}
            <div className="w-40">
              <PeriodSelector
                periods={periods.filter((p) => p.id !== periodId)}
                selectedId={baselinePeriodId}
                onSelect={setBaselinePeriodId}
                label="Compare to"
                allowNull
                nullLabel="No comparison"
              />
            </div>

            {/* Reset Button */}
            {hasChanges && (
              <button
                onClick={resetAll}
                className="flex items-center gap-2 px-3 py-2 bg-[#16213e] border border-[#0f3460] rounded-lg text-[#94a3b8] hover:text-white hover:border-red-400/50 transition-colors text-sm"
                title="Reset all changes"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tree Container */}
      <div className="bg-[#16213e] rounded-xl p-8 border border-[#0f3460] min-h-[600px]">
        {/* Error State */}
        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-red-400 text-lg mb-2">Error loading data</p>
              <p className="text-[#94a3b8] text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !error && (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-[#94a3b8] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#94a3b8]">Loading KPI data...</p>
            </div>
          </div>
        )}

        {/* Tree Visualization */}
        {!isLoading && !error && displayTree && renderTree()}

        {/* No Data State */}
        {!isLoading && !error && !displayTree && (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#94a3b8] text-lg">
              No KPI data available. Please run the seed script.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-[#64748b] text-sm">
        <p>
          Viewing period: {periodLabel} | Layout: {layoutLabel}
        </p>
      </footer>
    </div>
  );
}
