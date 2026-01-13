'use client';

import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { MobileOverlay } from './MobileMessage';
import { VerticalTree } from './VerticalTree';
import { HorizontalTree } from './HorizontalTree';
import { PeriodSelector } from './PeriodSelector';
import { LayoutToggle } from './LayoutToggle';
import { ThemeToggle } from './ThemeToggle';
import { useKpiTree } from '@/lib/kpi-tree/useKpiTree';

const MIN_WIDTH = 1024;

export function KpiTreeDashboard() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [isViewportLoading, setIsViewportLoading] = useState(true);
  const [mobileOverlayDismissed, setMobileOverlayDismissed] = useState(false);

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
    theme,
    setPercentChange,
    setPeriodId,
    setBaselinePeriodId,
    setLayout,
    setTheme,
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

  // Show mobile overlay (dismissible) for small viewports
  const showMobileOverlay = isMobile && !mobileOverlayDismissed;

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
      theme,
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

  // Theme-specific styles
  const bgColor = theme === 'dark' ? 'bg-[#0f172a]' : 'bg-gray-100';
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const mutedTextColor = theme === 'dark' ? 'text-[#94a3b8]' : 'text-gray-600';
  const containerBg = theme === 'dark' ? 'bg-[#16213e]' : 'bg-white';
  const containerBorder = theme === 'dark' ? 'border-[#0f3460]' : 'border-gray-200';
  const buttonBg = theme === 'dark' ? 'bg-[#16213e]' : 'bg-white';
  const buttonBorder = theme === 'dark' ? 'border-[#0f3460]' : 'border-gray-300';
  const footerTextColor = theme === 'dark' ? 'text-[#64748b]' : 'text-gray-500';

  return (
    <div className={`p-6 min-h-screen ${bgColor}`}>
      {/* Mobile Overlay */}
      {showMobileOverlay && (
        <MobileOverlay onDismiss={() => setMobileOverlayDismissed(true)} />
      )}

      {/* Header */}
      <header className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className={`text-3xl font-bold ${textColor} mb-2`}>
              KPI Driver Tree
            </h1>
            <p className={mutedTextColor}>
              Professional Services Gross Margin Analysis
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-end gap-4">
            {/* Theme Toggle */}
            <ThemeToggle theme={theme} onThemeChange={setTheme} />

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
                className={`flex items-center gap-2 px-3 py-2 ${buttonBg} border ${buttonBorder} rounded-lg ${mutedTextColor} hover:${textColor} hover:border-red-400/50 transition-colors text-sm`}
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
      <div className={`${containerBg} rounded-xl p-8 border ${containerBorder} min-h-[600px]`}>
        {/* Error State */}
        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-red-400 text-lg mb-2">Error loading data</p>
              <p className={`${mutedTextColor} text-sm`}>{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !error && (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center">
              <div className={`w-8 h-8 border-2 ${theme === 'dark' ? 'border-[#94a3b8]' : 'border-gray-400'} border-t-transparent rounded-full animate-spin mx-auto mb-4`} />
              <p className={mutedTextColor}>Loading KPI data...</p>
            </div>
          </div>
        )}

        {/* Tree Visualization */}
        {!isLoading && !error && displayTree && renderTree()}

        {/* No Data State */}
        {!isLoading && !error && !displayTree && (
          <div className="flex items-center justify-center h-full">
            <p className={`${mutedTextColor} text-lg`}>
              No KPI data available. Please run the seed script.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className={`mt-8 text-center ${footerTextColor} text-sm`}>
        <p>
          Viewing period: {periodLabel} | Layout: {layoutLabel}
        </p>
      </footer>
    </div>
  );
}
