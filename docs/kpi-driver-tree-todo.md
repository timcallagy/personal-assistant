# KPI Driver Tree - Implementation Checklist

## Prompt 1: Database Schema
- [x] Add KpiPeriod model to Prisma schema
- [x] Add KpiMetric model to Prisma schema
- [x] Add KpiMetricValue model to Prisma schema
- [x] Add unique constraints and relations
- [x] Generate Prisma migration "add_kpi_tree_models"
- [ ] Verify migration runs successfully (waiting for user to run on Render)

## Prompt 2: Seed Metric Definitions
- [x] Create seeds directory if not exists
- [x] Create kpiMetrics.ts seed file
- [x] Define Layer 1 metric (gross_margin)
- [x] Define Layer 2 metrics (revenue, costs)
- [x] Define Layer 3 metrics (4 metrics)
- [x] Define Layer 4 metrics (9 metrics)
- [x] Define Layer 5 metrics (18 metrics)
- [x] Export seedKpiMetrics() function
- [x] Verify all 34 metrics are defined

## Prompt 3: Seed Periods and Values
- [x] Create kpiPeriodValues.ts seed file
- [x] Create monthly periods (Oct-Dec 2025, Jan 2026)
- [x] Create quarterly periods (Q3-Q4 2025)
- [x] Set Jan 2026 as current period
- [x] Create base values for Jan 2026
- [x] Generate historical values with variance
- [x] Export seedKpiPeriodValues() function
- [x] Update main seed.ts to call both seed functions (created seed-kpi.ts)
- [ ] Run seed and verify data in database (pending migration)

## Prompt 4: API Endpoints
- [x] Create kpi-tree routes directory
- [x] Create kpiTreeService.ts service file
- [x] Implement GET /api/kpi-tree/periods endpoint
- [x] Implement GET /api/kpi-tree/metrics endpoint
- [x] Implement GET /api/kpi-tree/metrics/compare endpoint
- [x] Handle missing/invalid periodId errors
- [x] Calculate trend direction and percentage
- [x] Register routes in main API router
- [ ] Test endpoints manually or with curl (pending deployment)

## Prompt 5: Page Setup and Mobile Message
- [x] Create /kpi-driver-tree page route
- [x] Add page metadata (title)
- [x] Create KpiTreeDashboard container component
- [x] Apply dark theme styling
- [x] Create MobileMessage component
- [x] Implement viewport detection (<1024px)
- [x] Style mobile message appropriately
- [ ] Verify page loads on desktop and mobile (pending deployment)

## Prompt 6: Types and Formatting Utilities
- [x] Create lib/kpi-tree directory
- [x] Create types.ts with all interfaces
- [x] Define KpiPeriod interface
- [x] Define KpiMetric interface
- [x] Define KpiTreeNode interface
- [x] Define AspirationalChanges interface
- [x] Create formatting.ts
- [x] Implement formatValue() function
- [x] Implement formatAbbreviatedNumber() function
- [x] Implement formatPercentChange() function
- [x] Handle all unit types (currency, percent, ratio, count, hours)

## Prompt 7: Tree Structure Utilities
- [x] Create treeUtils.ts
- [x] Implement buildTree() function
- [x] Implement flattenTree() function
- [x] Implement findNode() function
- [x] Implement getAncestors() function
- [x] Implement getDescendants() function
- [x] Add JSDoc comments
- [ ] Test tree building with sample data (pending integration)

## Prompt 8: MetricNode Component (Display Only)
- [x] Create MetricNode.tsx component
- [x] Define props interface
- [x] Render metric name
- [x] Render actual value (formatted)
- [x] Render aspirational value (if different)
- [x] Render trend indicator placeholder
- [x] Apply dark theme card styling
- [x] Implement disabled state (50% opacity)
- [x] Apply favorable/unfavorable colors

## Prompt 9: VerticalTree Component and Data Hook
- [x] Create useKpiTree.ts hook
- [x] Add state for periods, metrics, loading, error
- [x] Fetch periods on mount
- [x] Fetch metrics for selected period
- [x] Build tree from metrics
- [x] Create VerticalTree.tsx component
- [x] Render layers as horizontal rows
- [x] Position nodes with spacing
- [x] Draw connection lines between nodes
- [x] Render MetricNode for each node
- [x] Update KpiTreeDashboard to use hook
- [x] Show loading spinner
- [x] Show error message
- [ ] Verify tree displays with actual values (pending deployment)

## Prompt 10: Calculation Module
- [x] Create calculations.ts
- [x] Define FORMULAS object for all calculated metrics
- [x] Implement applyPercentChange() function
- [x] Implement calculateAspirationalValues() function
- [x] Implement getDisabledMetrics() function
- [x] Handle calculation order (Layer 5 to Layer 1)
- [x] Add inline test comments

## Prompt 11: Percent Change Inputs and State
- [x] Update MetricNode with input props
- [x] Add % change input field
- [x] Style input (dark theme)
- [x] Handle input blur/Enter events
- [x] Add clear button
- [x] Hide input for Layer 1
- [x] Update useKpiTree with aspirationalChanges state
- [x] Implement setPercentChange() function
- [x] Calculate aspirationalValues using calculation module
- [x] Calculate disabledMetrics
- [x] Update VerticalTree to pass new props
- [ ] Verify inputs work and cascade calculations (pending deployment)

## Prompt 12: Grey-out Logic and Aspirational Display
- [x] Improve disabled state visual (opacity, lock icon)
- [x] Add tooltip for disabled metrics
- [x] Show actual with strikethrough when overridden
- [x] Show aspirational value prominently
- [x] Add % change badge with color coding
- [x] Implement isChangeFavorable() helper
- [x] Auto-clear descendant % changes when parent is set
- [x] Highlight connection lines for changed metrics

## Prompt 13: LocalStorage Persistence
- [x] Create storage.ts
- [x] Define StoredState interface
- [x] Implement saveState() function
- [x] Implement loadState() function
- [x] Implement clearState() function
- [x] Handle localStorage errors gracefully
- [x] Update useKpiTree to load state on mount
- [x] Save aspirationalChanges on change
- [x] Save periodId on change
- [x] Implement resetAll() function
- [x] Handle invalid saved periodId

## Prompt 14: Period Selectors
- [x] Create PeriodSelector.tsx component
- [x] Define props interface
- [x] Style dropdown (dark theme)
- [x] Group options by type (Monthly/Quarterly)
- [x] Sort by date descending
- [x] Mark current period
- [x] Support null option for baseline
- [x] Update KpiTreeDashboard header
- [x] Add viewing period selector
- [x] Add baseline period selector
- [x] Add reset button
- [x] Update useKpiTree with baselinePeriodId state
- [x] Save baseline to localStorage

## Prompt 15: Trend Indicators
- [x] Create TrendIndicator.tsx component
- [x] Render arrow icon (up/down/flat)
- [x] Render percentage change
- [x] Apply favorable/unfavorable colors
- [x] Update useKpiTree to fetch comparison data
- [x] Merge trend data into metrics
- [x] Update MetricNode to render TrendIndicator
- [x] Position indicator in bottom-right
- [x] Handle loading state for comparison fetch

## Prompt 16: Alternative Layouts and Final Polish
- [x] Create HorizontalTree.tsx component
- [x] Render layers as vertical columns
- [x] Draw horizontal connection lines (orthogonal bus-style)
- [x] Make scrollable if needed
- [ ] Create RadialTree.tsx component (optional)
- [ ] Position Layer 1 in center
- [ ] Arrange layers in concentric rings
- [ ] Draw radial connection lines
- [x] Create LayoutToggle.tsx component
- [x] Two toggle buttons (Vertical/Horizontal) - Radial optional
- [x] Save layout preference to localStorage
- [x] Update KpiTreeDashboard with layout toggle
- [x] Conditionally render selected layout
- [ ] Add layout transition animations (optional)
- [x] Verify all loading states
- [ ] Add error boundary
- [x] Add footer with period label
- [ ] Final testing of all features
- [ ] Verify mobile message works
- [ ] No console errors/warnings

## Final Verification
- [ ] All three layouts render correctly
- [ ] Actual values display from database
- [ ] % change inputs work
- [ ] Cascade calculations are correct
- [ ] Grey-out logic works
- [ ] localStorage persistence works
- [ ] Period selection works
- [ ] Baseline comparison and trends work
- [ ] Reset button works
- [ ] Mobile message displays
- [ ] Dark theme consistent throughout
- [ ] Deploy and test on production URL
