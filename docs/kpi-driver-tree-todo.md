# KPI Driver Tree - Implementation Checklist

## Prompt 1: Database Schema
- [ ] Add KpiPeriod model to Prisma schema
- [ ] Add KpiMetric model to Prisma schema
- [ ] Add KpiMetricValue model to Prisma schema
- [ ] Add unique constraints and relations
- [ ] Generate Prisma migration "add_kpi_tree_models"
- [ ] Verify migration runs successfully

## Prompt 2: Seed Metric Definitions
- [ ] Create seeds directory if not exists
- [ ] Create kpiMetrics.ts seed file
- [ ] Define Layer 1 metric (gross_margin)
- [ ] Define Layer 2 metrics (revenue, costs)
- [ ] Define Layer 3 metrics (4 metrics)
- [ ] Define Layer 4 metrics (9 metrics)
- [ ] Define Layer 5 metrics (18 metrics)
- [ ] Export seedKpiMetrics() function
- [ ] Verify all 34 metrics are defined

## Prompt 3: Seed Periods and Values
- [ ] Create kpiPeriodValues.ts seed file
- [ ] Create monthly periods (Oct-Dec 2025, Jan 2026)
- [ ] Create quarterly periods (Q3-Q4 2025)
- [ ] Set Jan 2026 as current period
- [ ] Create base values for Jan 2026
- [ ] Generate historical values with variance
- [ ] Export seedKpiPeriodValues() function
- [ ] Update main seed.ts to call both seed functions
- [ ] Run seed and verify data in database

## Prompt 4: API Endpoints
- [ ] Create kpi-tree routes directory
- [ ] Create kpiTreeService.ts service file
- [ ] Implement GET /api/kpi-tree/periods endpoint
- [ ] Implement GET /api/kpi-tree/metrics endpoint
- [ ] Implement GET /api/kpi-tree/metrics/compare endpoint
- [ ] Handle missing/invalid periodId errors
- [ ] Calculate trend direction and percentage
- [ ] Register routes in main API router
- [ ] Test endpoints manually or with curl

## Prompt 5: Page Setup and Mobile Message
- [ ] Create /kpi-driver-tree page route
- [ ] Add page metadata (title)
- [ ] Create KpiTreeDashboard container component
- [ ] Apply dark theme styling
- [ ] Create MobileMessage component
- [ ] Implement viewport detection (<1024px)
- [ ] Style mobile message appropriately
- [ ] Verify page loads on desktop and mobile

## Prompt 6: Types and Formatting Utilities
- [ ] Create lib/kpi-tree directory
- [ ] Create types.ts with all interfaces
- [ ] Define KpiPeriod interface
- [ ] Define KpiMetric interface
- [ ] Define KpiTreeNode interface
- [ ] Define AspirationalChanges interface
- [ ] Create formatting.ts
- [ ] Implement formatValue() function
- [ ] Implement formatAbbreviatedNumber() function
- [ ] Implement formatPercentChange() function
- [ ] Handle all unit types (currency, percent, ratio, count, hours)

## Prompt 7: Tree Structure Utilities
- [ ] Create treeUtils.ts
- [ ] Implement buildTree() function
- [ ] Implement flattenTree() function
- [ ] Implement findNode() function
- [ ] Implement getAncestors() function
- [ ] Implement getDescendants() function
- [ ] Add JSDoc comments
- [ ] Test tree building with sample data

## Prompt 8: MetricNode Component (Display Only)
- [ ] Create MetricNode.tsx component
- [ ] Define props interface
- [ ] Render metric name
- [ ] Render actual value (formatted)
- [ ] Render aspirational value (if different)
- [ ] Render trend indicator placeholder
- [ ] Apply dark theme card styling
- [ ] Implement disabled state (50% opacity)
- [ ] Apply favorable/unfavorable colors

## Prompt 9: VerticalTree Component and Data Hook
- [ ] Create useKpiTree.ts hook
- [ ] Add state for periods, metrics, loading, error
- [ ] Fetch periods on mount
- [ ] Fetch metrics for selected period
- [ ] Build tree from metrics
- [ ] Create VerticalTree.tsx component
- [ ] Render layers as horizontal rows
- [ ] Position nodes with spacing
- [ ] Draw connection lines between nodes
- [ ] Render MetricNode for each node
- [ ] Update KpiTreeDashboard to use hook
- [ ] Show loading spinner
- [ ] Show error message
- [ ] Verify tree displays with actual values

## Prompt 10: Calculation Module
- [ ] Create calculations.ts
- [ ] Define FORMULAS object for all calculated metrics
- [ ] Implement applyPercentChange() function
- [ ] Implement calculateAspirationalValues() function
- [ ] Implement getDisabledMetrics() function
- [ ] Handle calculation order (Layer 5 to Layer 1)
- [ ] Add inline test comments

## Prompt 11: Percent Change Inputs and State
- [ ] Update MetricNode with input props
- [ ] Add % change input field
- [ ] Style input (dark theme)
- [ ] Handle input blur/Enter events
- [ ] Add clear button
- [ ] Hide input for Layer 1
- [ ] Update useKpiTree with aspirationalChanges state
- [ ] Implement setPercentChange() function
- [ ] Calculate aspirationalValues using calculation module
- [ ] Calculate disabledMetrics
- [ ] Update VerticalTree to pass new props
- [ ] Verify inputs work and cascade calculations

## Prompt 12: Grey-out Logic and Aspirational Display
- [ ] Improve disabled state visual (opacity, lock icon)
- [ ] Add tooltip for disabled metrics
- [ ] Show actual with strikethrough when overridden
- [ ] Show aspirational value prominently
- [ ] Add % change badge with color coding
- [ ] Implement isChangeFavorable() helper
- [ ] Auto-clear descendant % changes when parent is set
- [ ] Highlight connection lines for changed metrics

## Prompt 13: LocalStorage Persistence
- [ ] Create storage.ts
- [ ] Define StoredState interface
- [ ] Implement saveState() function
- [ ] Implement loadState() function
- [ ] Implement clearState() function
- [ ] Handle localStorage errors gracefully
- [ ] Update useKpiTree to load state on mount
- [ ] Save aspirationalChanges on change
- [ ] Save periodId on change
- [ ] Implement resetAll() function
- [ ] Handle invalid saved periodId

## Prompt 14: Period Selectors
- [ ] Create PeriodSelector.tsx component
- [ ] Define props interface
- [ ] Style dropdown (dark theme)
- [ ] Group options by type (Monthly/Quarterly)
- [ ] Sort by date descending
- [ ] Mark current period
- [ ] Support null option for baseline
- [ ] Update KpiTreeDashboard header
- [ ] Add viewing period selector
- [ ] Add baseline period selector
- [ ] Add reset button
- [ ] Update useKpiTree with baselinePeriodId state
- [ ] Save baseline to localStorage

## Prompt 15: Trend Indicators
- [ ] Create TrendIndicator.tsx component
- [ ] Render arrow icon (up/down/flat)
- [ ] Render percentage change
- [ ] Apply favorable/unfavorable colors
- [ ] Update useKpiTree to fetch comparison data
- [ ] Merge trend data into metrics
- [ ] Update MetricNode to render TrendIndicator
- [ ] Position indicator in bottom-right
- [ ] Handle loading state for comparison fetch

## Prompt 16: Alternative Layouts and Final Polish
- [ ] Create HorizontalTree.tsx component
- [ ] Render layers as vertical columns
- [ ] Draw horizontal connection lines
- [ ] Make scrollable if needed
- [ ] Create RadialTree.tsx component
- [ ] Position Layer 1 in center
- [ ] Arrange layers in concentric rings
- [ ] Draw radial connection lines
- [ ] Create LayoutToggle.tsx component
- [ ] Three toggle buttons (Vertical/Horizontal/Radial)
- [ ] Save layout preference to localStorage
- [ ] Update KpiTreeDashboard with layout toggle
- [ ] Conditionally render selected layout
- [ ] Add layout transition animations
- [ ] Verify all loading states
- [ ] Add error boundary
- [ ] Add footer with period label
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
