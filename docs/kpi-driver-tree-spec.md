# KPI Driver Tree Dashboard - Technical Specification

## 1. Overview

### 1.1 Purpose
An internal business analysis dashboard that visualizes a 5-layer driver tree (value tree / KPI decomposition) for a professional services firm. The dashboard enables users to understand what drives Gross Margin and model aspirational scenarios by adjusting metrics at any level.

### 1.2 Key Features
- Interactive 5-layer driver tree visualization
- Three layout options: Vertical, Horizontal, and Radial
- Actual values pulled from database
- Aspirational values set via % change inputs
- Cascading calculations that flow downward through the tree
- Trend indicators comparing to user-selected baseline periods
- Dark theme with pastel accent colors

### 1.3 Target Users
Internal business analysts and leadership team members analyzing firm performance.

### 1.4 URL
`https://timcallagy.com/kpi-driver-tree`

---

## 2. Architecture

### 2.1 Tech Stack
- **Frontend**: Next.js (existing codebase in `packages/web`)
- **Backend**: Node.js API (existing codebase in `packages/api`)
- **Database**: PostgreSQL (existing Prisma setup)
- **Deployment**: Render (existing infrastructure)

### 2.2 Integration Points
- New page at `/kpi-driver-tree` in the web package
- New API endpoints under `/api/kpi-tree/`
- New Prisma models for metrics and periods
- Browser localStorage for persisting aspirational values

### 2.3 Authentication
None required - publicly accessible at the URL.

---

## 3. Data Model

### 3.1 Database Schema (Prisma)

```prisma
model KpiPeriod {
  id          Int       @id @default(autoincrement())
  type        String    // 'monthly' | 'quarterly'
  year        Int
  month       Int?      // 1-12 for monthly, null for quarterly
  quarter     Int?      // 1-4 for quarterly, null for monthly
  label       String    // e.g., "Jan 2026", "Q1 2026"
  startDate   DateTime
  endDate     DateTime
  isCurrent   Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  metrics     KpiMetricValue[]

  @@unique([type, year, month])
  @@unique([type, year, quarter])
}

model KpiMetric {
  id          Int       @id @default(autoincrement())
  key         String    @unique  // e.g., "gross_margin", "revenue", "bench_time"
  name        String    // Display name
  layer       Int       // 1-5
  parentKey   String?   // Key of parent metric (null for layer 1)
  unit        String    // 'percent' | 'currency' | 'ratio' | 'count' | 'hours'
  favorable   String    // 'up' | 'down' - which direction is good
  formula     String?   // Optional formula description
  sortOrder   Int       // For consistent ordering in UI
  createdAt   DateTime  @default(now())

  values      KpiMetricValue[]
}

model KpiMetricValue {
  id          Int       @id @default(autoincrement())
  metricId    Int
  periodId    Int
  value       Float
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  metric      KpiMetric  @relation(fields: [metricId], references: [id])
  period      KpiPeriod  @relation(fields: [periodId], references: [id])

  @@unique([metricId, periodId])
}
```

### 3.2 Metric Definitions

#### Layer 1 - North Star Outcome
| Key | Name | Unit | Favorable |
|-----|------|------|-----------|
| `gross_margin` | Gross Margin | percent | up |

#### Layer 2 - Primary Financial Drivers
| Key | Name | Unit | Favorable | Parent |
|-----|------|------|-----------|--------|
| `revenue` | Revenue | currency | up | gross_margin |
| `costs` | Costs | currency | down | gross_margin |

#### Layer 3 - Structural Drivers
| Key | Name | Unit | Favorable | Parent |
|-----|------|------|-----------|--------|
| `billable_hours` | Billable Hours Delivered | hours | up | revenue |
| `avg_realised_price` | Avg Realised Price/Hour | currency | up | revenue |
| `delivery_costs` | Delivery Costs | currency | down | costs |
| `non_delivery_costs` | Non-Delivery Costs | currency | down | costs |

#### Layer 4 - Operational Drivers
| Key | Name | Unit | Favorable | Parent |
|-----|------|------|-----------|--------|
| `total_capacity_hours` | Total Capacity Hours | hours | up | billable_hours |
| `utilisation_rate` | Utilisation Rate | percent | up | billable_hours |
| `list_rate` | List/Contract Rate | currency | up | avg_realised_price |
| `price_leakage` | Price Leakage | currency | down | avg_realised_price |
| `delivery_headcount` | Delivery Headcount | count | - | delivery_costs |
| `cost_per_fte` | Fully Loaded Cost/FTE | currency | down | delivery_costs |
| `mgmt_ops_costs` | Management & Ops Costs | currency | down | non_delivery_costs |
| `tools_facilities` | Tools, Facilities, Travel | currency | down | non_delivery_costs |
| `shared_corporate` | Shared Corporate Costs | currency | down | non_delivery_costs |

#### Layer 5 - Behavioural & Management Levers

**Under Utilisation Rate:**
| Key | Name | Unit | Favorable |
|-----|------|------|-----------|
| `bench_time` | Bench Time | percent | down |
| `ramp_time` | Ramp-Up/Ramp-Down Time | percent | down |
| `planning_accuracy` | Project Planning Accuracy | percent | up |
| `unbilled_internal` | Unbilled Internal Work | percent | down |
| `sick_leave_pto` | Sick Leave / PTO | percent | down |

**Under Price Leakage:**
| Key | Name | Unit | Favorable |
|-----|------|------|-----------|
| `discounting` | Discounting at Sale | percent | down |
| `scope_creep` | Scope Creep | percent | down |
| `over_delivery` | Over-delivery vs SOW | percent | down |
| `write_offs` | Write-offs / Write-ups | currency | down |
| `renewal_mix` | Renewals vs New Business Mix | percent | up |

**Under Delivery Headcount:**
| Key | Name | Unit | Favorable |
|-----|------|------|-----------|
| `hiring_vs_demand` | Hiring Plan vs Demand | percent | up |
| `attrition_rate` | Attrition / Backfill Rate | percent | down |
| `skill_mix` | Skill Mix (Senior vs Junior) | percent | - |
| `contractor_ratio` | Contractors vs FTEs | percent | - |

**Under Non-Delivery Costs:**
| Key | Name | Unit | Favorable |
|-----|------|------|-----------|
| `span_of_control` | Span of Control | ratio | up |
| `mgmt_layers` | Management Layers | count | down |
| `tool_sprawl` | Tool Sprawl | currency | down |
| `travel_adherence` | Travel Policy Adherence | percent | up |

---

## 4. Calculation Logic

### 4.1 Formulas (Bottom-Up for Actuals)

```
Layer 4 → Layer 3:
  billable_hours = total_capacity_hours × utilisation_rate
  avg_realised_price = list_rate - price_leakage
  delivery_costs = delivery_headcount × cost_per_fte
  non_delivery_costs = mgmt_ops_costs + tools_facilities + shared_corporate

Layer 3 → Layer 2:
  revenue = billable_hours × avg_realised_price
  costs = delivery_costs + non_delivery_costs

Layer 2 → Layer 1:
  gross_margin = ((revenue - costs) / revenue) × 100
```

### 4.2 Aspirational Calculation Logic

When a user sets an aspirational % change on a metric:

1. **Calculate aspirational value**: `aspirational = actual × (1 + percentChange/100)`

2. **Cascade downward**: Recalculate all descendant metrics (toward Layer 1) using the formulas above

3. **Grey out children**: All metrics that feed INTO the changed metric (higher layer numbers) become disabled (50% opacity, non-editable)

4. **Override behavior**: Setting a % change at Layer N overrides any previously set % changes at Layers N-1, N-2, etc. for that branch

### 4.3 Cascade Example

If user sets +10% on `utilisation_rate` (Layer 4):
1. `utilisation_rate` aspirational = actual × 1.10
2. Recalculate `billable_hours` (Layer 3) using new utilisation
3. Recalculate `revenue` (Layer 2) using new billable hours
4. Recalculate `gross_margin` (Layer 1) using new revenue
5. Grey out all Layer 5 metrics under `utilisation_rate`

---

## 5. API Endpoints

### 5.1 GET `/api/kpi-tree/periods`
Returns all available periods for selection.

**Response:**
```json
{
  "periods": [
    {
      "id": 1,
      "type": "monthly",
      "label": "Jan 2026",
      "year": 2026,
      "month": 1,
      "isCurrent": true
    }
  ],
  "currentPeriod": { ... }
}
```

### 5.2 GET `/api/kpi-tree/metrics?periodId={id}`
Returns all metrics with actual values for the specified period.

**Response:**
```json
{
  "period": { "id": 1, "label": "Jan 2026" },
  "metrics": [
    {
      "key": "gross_margin",
      "name": "Gross Margin",
      "layer": 1,
      "parentKey": null,
      "unit": "percent",
      "favorable": "up",
      "value": 32.5
    }
  ]
}
```

### 5.3 GET `/api/kpi-tree/metrics/compare?periodId={id}&baselinePeriodId={id}`
Returns metrics for both periods to calculate trend indicators.

**Response:**
```json
{
  "currentPeriod": { ... },
  "baselinePeriod": { ... },
  "metrics": [
    {
      "key": "gross_margin",
      "name": "Gross Margin",
      "currentValue": 32.5,
      "baselineValue": 30.2,
      "trend": "up",
      "trendPercent": 7.6
    }
  ]
}
```

---

## 6. UI/UX Requirements

### 6.1 Layout Options

Implement all three layouts for user comparison:

1. **Vertical**: Layer 1 at top, Layer 5 at bottom. Tree expands downward.
2. **Horizontal**: Layer 1 on left, Layer 5 on right. Tree expands rightward.
3. **Radial/Sunburst**: Layer 1 in center, expanding outward in concentric rings.

Include a layout toggle/tabs to switch between views.

### 6.2 Node Display

Each metric node displays:
- **Metric name** (prominent)
- **Actual value** (formatted per unit type)
- **Aspirational value** (if different from actual)
- **% change input field** (editable, except Layer 1)
- **Trend indicator** (↑ or ↓ arrow with color)

### 6.3 Visual Design

- **Theme**: Dark background with light text
- **Colors**:
  - Favorable trend: Pastel green (#86efac or similar)
  - Unfavorable trend: Pastel red (#fca5a5 or similar)
  - Neutral: Pastel gray/blue
  - Disabled state: 50% opacity
- **Typography**: Clean sans-serif, clear hierarchy
- **Node styling**: Rounded corners, subtle borders, card-like appearance

### 6.4 Controls

- **Period selector**: Dropdown to select current viewing period (default: current in-progress)
- **Baseline selector**: Dropdown to select comparison period for trends
- **Layout toggle**: Switch between Vertical / Horizontal / Radial
- **Reset button**: Clear all aspirational % changes

### 6.5 Responsive Behavior

- **Desktop**: Full tree visualization with all controls
- **Mobile/Tablet**: Display message: "This dashboard is optimized for desktop viewing. Please access on a larger screen for the best experience."

### 6.6 Number Formatting

| Unit | Format | Example |
|------|--------|---------|
| currency | € + abbreviated, no decimals | €15M, €234K, €5K |
| percent | 1 decimal place + % | 72.3%, 8.5% |
| hours | Abbreviated with h | 125K h, 8.2K h |
| count | Integer, abbreviated if large | 102, 1.2K |
| ratio | X:1 format | 8:1, 12:1 |

---

## 7. State Management

### 7.1 Browser localStorage

Store aspirational values per user in localStorage:

```json
{
  "kpiDriverTree": {
    "periodId": 1,
    "aspirationalChanges": {
      "utilisation_rate": 10,
      "discounting": -5
    },
    "selectedLayout": "vertical",
    "baselinePeriodId": null
  }
}
```

### 7.2 State Restoration

On page load:
1. Load saved state from localStorage
2. Fetch actual values for saved periodId (or current period if none saved)
3. Apply saved aspirational % changes
4. Restore layout preference
5. Restore baseline period selection

---

## 8. Error Handling

### 8.1 API Errors

| Scenario | Handling |
|----------|----------|
| Network failure | Display toast: "Unable to load data. Please check your connection." Retry button. |
| Invalid period | Fallback to current period, show warning |
| Missing metrics | Display available metrics, show "Data unavailable" for missing |

### 8.2 Calculation Errors

| Scenario | Handling |
|----------|----------|
| Division by zero | Display "N/A" for affected metrics |
| Invalid % input | Validate input: allow -100 to +1000, show error for out-of-range |
| Circular dependency | Should not occur with proper tree structure; log error if detected |

### 8.3 Storage Errors

| Scenario | Handling |
|----------|----------|
| localStorage unavailable | Graceful degradation: aspirational values work but don't persist |
| Corrupted stored data | Clear storage, start fresh, show info message |

---

## 9. Testing Plan

### 9.1 Unit Tests

**Calculation Logic:**
- [ ] Test each formula produces correct results
- [ ] Test cascade calculation from each layer
- [ ] Test % change application at each layer
- [ ] Test grey-out logic correctly identifies affected children
- [ ] Test override behavior when setting % at higher layer

**Formatting:**
- [ ] Test currency formatting (€15M, €234K, etc.)
- [ ] Test percentage formatting (72.3%)
- [ ] Test ratio formatting (8:1)
- [ ] Test edge cases (0, negative, very large numbers)

### 9.2 Integration Tests

**API:**
- [ ] GET /periods returns valid period list
- [ ] GET /metrics returns all metrics with values
- [ ] GET /metrics/compare returns correct trend data
- [ ] Invalid periodId returns appropriate error

**Data Flow:**
- [ ] Actual values load correctly from database
- [ ] Aspirational changes persist to localStorage
- [ ] State restores correctly on page reload

### 9.3 E2E Tests

**User Flows:**
- [ ] Load dashboard, view default period
- [ ] Change viewing period, verify data updates
- [ ] Set aspirational % on Layer 4 metric, verify cascade to Layer 1
- [ ] Set aspirational % on Layer 3, verify Layer 4 metrics grey out
- [ ] Select baseline period, verify trend indicators appear
- [ ] Switch between all three layouts
- [ ] Reset aspirational values
- [ ] Refresh page, verify state persists

### 9.4 Visual/Manual Testing

- [ ] Verify all three layouts render correctly
- [ ] Verify color coding (green favorable, red unfavorable)
- [ ] Verify disabled state (50% opacity)
- [ ] Verify mobile message displays on small screens
- [ ] Verify dark theme appearance
- [ ] Cross-browser testing (Chrome, Firefox, Safari)

---

## 10. Sample Data

### 10.1 Business Profile
- Mid-size professional services firm
- ~100 delivery staff
- ~€20M annual revenue
- ~€14M annual costs
- ~30% gross margin

### 10.2 Sample Values (Monthly - Jan 2026)

**Layer 1:**
| Metric | Value |
|--------|-------|
| Gross Margin | 31.5% |

**Layer 2:**
| Metric | Value |
|--------|-------|
| Revenue | €1,680,000 |
| Costs | €1,150,800 |

**Layer 3:**
| Metric | Value |
|--------|-------|
| Billable Hours Delivered | 12,000 h |
| Avg Realised Price/Hour | €140 |
| Delivery Costs | €850,000 |
| Non-Delivery Costs | €300,800 |

**Layer 4:**
| Metric | Value |
|--------|-------|
| Total Capacity Hours | 16,000 h |
| Utilisation Rate | 75.0% |
| List/Contract Rate | €165 |
| Price Leakage | €25 |
| Delivery Headcount | 100 |
| Fully Loaded Cost/FTE | €8,500 |
| Management & Ops Costs | €180,000 |
| Tools, Facilities, Travel | €70,800 |
| Shared Corporate Costs | €50,000 |

**Layer 5:**
| Metric | Value |
|--------|-------|
| Bench Time | 8.0% |
| Ramp-Up/Ramp-Down Time | 5.0% |
| Project Planning Accuracy | 85.0% |
| Unbilled Internal Work | 7.0% |
| Sick Leave / PTO | 5.0% |
| Discounting at Sale | 8.0% |
| Scope Creep | 3.0% |
| Over-delivery vs SOW | 4.0% |
| Write-offs / Write-ups | €15,000 |
| Renewals vs New Business Mix | 65.0% |
| Hiring Plan vs Demand | 92.0% |
| Attrition / Backfill Rate | 15.0% |
| Skill Mix (Senior vs Junior) | 40.0% |
| Contractors vs FTEs | 12.0% |
| Span of Control | 8:1 |
| Management Layers | 4 |
| Tool Sprawl | €35,000 |
| Travel Policy Adherence | 88.0% |

### 10.3 Additional Periods to Generate
- Dec 2025 (previous month)
- Nov 2025
- Oct 2025
- Q4 2025 (quarterly)
- Q3 2025 (quarterly)
- Q2 2025 (quarterly)
- Q1 2025 (quarterly)

Values should show realistic month-over-month variation (±2-5% on most metrics).

---

## 11. File Structure

```
packages/web/src/
├── app/
│   └── kpi-driver-tree/
│       └── page.tsx              # Main page component
├── components/
│   └── kpi-tree/
│       ├── KpiTreeDashboard.tsx  # Main dashboard container
│       ├── VerticalTree.tsx      # Vertical layout
│       ├── HorizontalTree.tsx    # Horizontal layout
│       ├── RadialTree.tsx        # Radial/sunburst layout
│       ├── MetricNode.tsx        # Individual metric card
│       ├── PeriodSelector.tsx    # Period dropdown
│       ├── LayoutToggle.tsx      # Layout switcher
│       ├── TrendIndicator.tsx    # Up/down arrow component
│       └── MobileMessage.tsx     # Mobile viewport message
├── hooks/
│   └── useKpiTree.ts             # Data fetching & state management
├── lib/
│   └── kpi-tree/
│       ├── calculations.ts       # Formula & cascade logic
│       ├── formatting.ts         # Number formatting utilities
│       ├── storage.ts            # localStorage helpers
│       └── types.ts              # TypeScript interfaces

packages/api/src/
├── routes/
│   └── kpi-tree/
│       └── index.ts              # API routes
├── services/
│   └── kpiTreeService.ts         # Business logic
└── prisma/
    └── schema.prisma             # Add new models
```

---

## 12. Implementation Phases

### Phase 1: Foundation
1. Add Prisma models and run migration
2. Create seed script with sample data
3. Implement API endpoints
4. Create basic page structure

### Phase 2: Core Visualization
1. Implement MetricNode component
2. Build Vertical tree layout
3. Add period selection
4. Implement actual value display

### Phase 3: Aspirational Features
1. Add % change inputs
2. Implement cascade calculation logic
3. Add grey-out behavior for overridden children
4. Implement localStorage persistence

### Phase 4: Additional Layouts
1. Build Horizontal tree layout
2. Build Radial tree layout
3. Add layout toggle

### Phase 5: Polish
1. Add trend indicators and baseline comparison
2. Implement number formatting
3. Add mobile message
4. Error handling and edge cases
5. Testing

---

## 13. Open Questions / Decisions

1. **D3.js vs custom SVG vs CSS**: For tree visualization, recommend D3.js for flexibility across all three layouts
2. **Animation**: Should transitions animate when switching layouts or changing values? (Recommend: subtle animations for polish)
3. **Print/Export**: Any need to export the tree as image or PDF? (Not in scope per requirements)

---

## Appendix A: Metric Hierarchy Diagram

```
Layer 1:  [Gross Margin %]
              │
    ┌─────────┴─────────┐
    │                   │
Layer 2:  [Revenue]          [Costs]
              │                   │
    ┌─────────┴──────┐    ┌──────┴───────┐
    │                │    │              │
Layer 3:  [Billable   [Avg     [Delivery  [Non-Delivery
           Hours]    Price]    Costs]      Costs]
              │         │         │              │
         ┌────┴────┐   ┌┴──┐    ┌─┴─┐      ┌────┼────┐
         │         │   │   │    │   │      │    │    │
Layer 4:  [Capacity] [Util] [Rate] [Leak] [HC] [Cost] [Mgmt] [Tools] [Corp]
              │         │     │      │      │     │      │      │      │
Layer 5:    (n/a)    [5 metrics] (n/a) [5 metrics] [4 metrics]  [4 metrics]
```

---

*Document Version: 1.0*
*Created: January 2026*
*Status: Ready for Development*
