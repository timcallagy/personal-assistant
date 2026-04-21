# Babblo Funnel — Implementation Blueprint & LLM Prompts

## Stack Reference
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS (dark slate/cyan theme)
- **Backend:** Express.js 5, TypeScript, Prisma 5 ORM, PostgreSQL
- **Monorepo:** pnpm workspaces, Turbo
- **Drag-and-drop:** `@dnd-kit/core` (already installed)
- **Auth:** Session cookie (`pa_session`) + API key; `sessionAuth` middleware on all protected routes
- **API prefix:** `/api/v1`
- **Protected page path convention:** `packages/web/src/app/(pa)/[feature]/page.tsx`
- **Route convention:** Express route files in `packages/api/src/routes/`; registered in central router

---

## Blueprint: Phase-by-Phase Overview

### Phase 1 — Data Layer (Backend foundation)
1. Prisma schema: add `BabbloFunnelConfig` model
2. PostHog service: HogQL query helper with test-user exclusion
3. Google Ads service: install count fetcher

### Phase 2 — Backend API
4. Shared TypeScript types (used by both API and web)
5. Config endpoints: `GET/POST /api/v1/babblo/funnel-config`
6. Filter options + events endpoints: `GET /api/v1/babblo/funnel-events`, `GET /api/v1/babblo/funnel-filter-options`
7. Main funnel endpoint: `GET /api/v1/babblo/funnel`

### Phase 3 — Frontend Foundation
8. API client additions + `useBabbloFunnel` hook
9. Filter bar component
10. Step configurator (draggable checklist with dnd-kit)

### Phase 4 — Assembly
11. Funnel table component
12. Page assembly + sidebar nav item

---

## Prompt Series

---

### Prompt 1 — Prisma Schema: BabbloFunnelConfig

**Context:** We are adding a Babblo Funnel page to an existing Personal Assistant app (Next.js 14 frontend + Express.js backend + PostgreSQL via Prisma 5). This is the first step: adding the database model that persists a user's funnel step configuration (which PostHog events to show, in what order).

```
You are working in a TypeScript monorepo. The Prisma schema is at:
  packages/api/prisma/schema.prisma

The existing User model already exists (with id, username, apiKey, etc.). Add a new model called BabbloFunnelConfig that stores a user's funnel step configuration.

Requirements:
- One record per user (one-to-one relationship with User)
- Store an ordered list of steps as JSON. Each step has: event (string) and visible (boolean)
- Track when it was last updated
- Use Prisma's @relation to link to the User model

After updating the schema, create a migration file. Run:
  cd packages/api && npx prisma migrate dev --name add_babblo_funnel_config

The model should be:

model BabbloFunnelConfig {
  id        String   @id @default(cuid())
  userId    String   @unique
  steps     Json     // [{ event: string, visible: boolean }]
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

Also add the reverse relation field to the User model:
  babbloFunnelConfig BabbloFunnelConfig?

Confirm the migration runs cleanly and the Prisma client regenerates without errors.
```

---

### Prompt 2 — PostHog Service

**Context:** We now have the DB model. Next we build the server-side PostHog service that all funnel API routes will use. This lives in `packages/api/src/services/posthog.ts`. The existing `stats-poc/posthog.js` script shows the working query patterns and credentials — we are formalising these into a typed, reusable service.

```
Create a new TypeScript service at:
  packages/api/src/services/posthog.ts

This service wraps the PostHog HogQL query API. It must:

1. Read credentials from environment variables (add these to your .env):
   POSTHOG_API_KEY=<your_posthog_api_key>
   POSTHOG_PROJECT_ID=100831
   POSTHOG_BASE_URL=eu.posthog.com

2. Export a single async function:
   hogql(query: string): Promise<unknown[][]>

   It POSTs to: https://eu.posthog.com/api/projects/{PROJECT_ID}/query/
   With body: { query: { kind: 'HogQLQuery', query } }
   Auth header: Bearer {API_KEY}
   Throws an Error if result.error is present.
   Returns result.results (array of rows, each row is an array of values).

3. Export a constant:
   EXCLUDE_FILTER = "AND person.properties.$email NOT IN ('timcallagy@gmail.com', 'androidTest1@test.com')"

4. Export these helper functions, each accepting dateFrom: string and dateTo: string (YYYY-MM-DD):

   a. getFunnelCounts(dateFrom, dateTo, events: string[], versionFilter?: string[], geoFilter?: string[])
      → Promise<Record<string, number>>
      Runs a single batched HogQL query:
        SELECT event, count(distinct person_id) as users
        FROM events
        WHERE event IN (...)
          AND timestamp >= '<dateFrom>'
          AND timestamp < '<dateTo>'
          [AND JSONExtractString(properties, 'app_version') IN (...) if versionFilter provided]
          [AND JSONExtractString(properties, '$geoip_country_name') IN (...) if geoFilter provided]
          AND person.properties.$email NOT IN ('timcallagy@gmail.com', 'androidTest1@test.com')
        GROUP BY event
      Returns { 'App Opened': 44, 'Onboarding Started': 43, ... }
      Events not present in results should return 0.

   b. getDistinctEvents(lookbackDays = 90): Promise<string[]>
      Returns all distinct event names from the last N days, ordered by frequency desc.
      Excludes PostHog system events starting with '$'.

   c. getDistinctVersions(lookbackDays = 90): Promise<string[]>
      Returns distinct app_version values, sorted descending.

   d. getDistinctCountries(lookbackDays = 90): Promise<string[]>
      Returns distinct $geoip_country_name values, sorted ascending.

Use the native Node.js https module (no fetch, no axios) for HTTP requests — consistent with the existing stats-poc scripts. All functions must be fully typed with TypeScript.
```

---

### Prompt 3 — Google Ads Service

**Context:** The PostHog service is done. Now we add the Google Ads service, which provides the install count (first row of the funnel). The existing `stats-poc/posthog.js` already has working Google Ads code we are formalising.

```
Create a new TypeScript service at:
  packages/api/src/services/googleAds.ts

This service fetches install counts from Google Ads for a given date range.

Add these environment variables to .env:
  GOOGLE_ADS_DEVELOPER_TOKEN=  (read from stats_api_keys/google_ads_token)
  GOOGLE_ADS_CUSTOMER_ID=3307160609
  GOOGLE_ADS_CLIENT_ID=        (from client_secret JSON: installed.client_id)
  GOOGLE_ADS_CLIENT_SECRET=    (from client_secret JSON: installed.client_secret)
  GOOGLE_ADS_REFRESH_TOKEN=    (from oauth token JSON: refresh_token)

Install the required package if not already present:
  pnpm add google-ads-api --filter @persassistant/api

The service must export one async function:

  getInstallCount(dateFrom: string, dateTo: string): Promise<number>

  - dateFrom and dateTo are YYYY-MM-DD strings (inclusive on both ends for Google Ads)
  - Query metrics.conversions from the campaign report:
      SELECT segments.date, metrics.conversions
      FROM campaign
      WHERE segments.date BETWEEN '<dateFrom>' AND '<dateTo>'
      ORDER BY segments.date DESC
  - Sum Math.round(row.metrics.conversions) across all rows and return the total
  - If the API throws an error, log it server-side and return null (do not throw — 
    callers must handle null gracefully so the funnel still renders without installs)

Return type: Promise<number | null>

The GoogleAdsApi client should be instantiated once (module-level singleton) using the env vars above.
```

---

### Prompt 4 — Shared TypeScript Types

**Context:** Both the Express API and Next.js frontend need to agree on the shape of funnel data. We define shared types in `packages/shared/src/index.ts`, which already exists and is imported by both packages.

```
Add the following TypeScript types to packages/shared/src/index.ts (append, do not replace existing exports):

// One configured funnel step
export interface FunnelStep {
  event: string;    // Raw PostHog event name, or 'installs' for the Google Ads row
  visible: boolean;
}

// Per-version user count (only present when version filter is active)
export type VersionCounts = Record<string, number>;

// One row of the funnel table
export interface FunnelRow {
  event: string;
  all: number;                    // Combined count across all selected versions/geos
  versions?: VersionCounts;       // Only present when 2+ specific versions are selected
}

// Full response from GET /api/v1/babblo/funnel
export interface FunnelResponse {
  installs: number | null;        // null if Google Ads unavailable
  steps: FunnelRow[];
  dateFrom: string;
  dateTo: string;
}

// Response from GET /api/v1/babblo/funnel-filter-options
export interface FunnelFilterOptions {
  versions: string[];
  countries: string[];
}

// Response from GET /api/v1/babblo/funnel-events
export interface FunnelEventsResponse {
  events: string[];
}

// Request/response for GET and POST /api/v1/babblo/funnel-config
export interface FunnelConfigResponse {
  steps: FunnelStep[];
}

After adding these types, confirm the shared package builds cleanly:
  cd packages/shared && pnpm build
```

---

### Prompt 5 — Config API Endpoints

**Context:** Shared types are defined. Now we add the two config endpoints that save and retrieve a user's funnel step configuration from the database.

```
Create a new Express router file at:
  packages/api/src/routes/babblo/funnelConfig.ts

Add two endpoints to this router:

GET /funnel-config
  - Auth: sessionAuth middleware (already used throughout the codebase)
  - Fetch BabbloFunnelConfig for req.user.id using Prisma
  - If no config exists, return the default steps (see below)
  - Response: FunnelConfigResponse (from shared types)

POST /funnel-config
  - Auth: sessionAuth middleware
  - Body: FunnelConfigResponse (array of { event, visible } objects)
  - Validate: steps must be a non-empty array; each item must have event (string) and visible (boolean)
  - Upsert using prisma.babbloFunnelConfig.upsert (where: { userId }, create: {...}, update: {...})
  - Response: { message: 'Saved', steps }
  - On validation error: 400 with message
  - On DB error: 500 with message, log server-side

Default steps (returned when no config exists):
[
  { event: 'installs', visible: true },
  { event: 'App Opened', visible: true },
  { event: 'Onboarding Started', visible: true },
  { event: 'Target Language Selected', visible: true },
  { event: 'Onboarding Topics Viewed', visible: true },
  { event: 'Onboarding Topic Selected', visible: true },
  { event: 'Sign Up Attempted', visible: true },
  { event: 'Login Attempted', visible: true },
  { event: 'call_started', visible: true },
]

Then register this router in the existing babblo routes file (packages/api/src/routes/babblo/index.ts or equivalent).
Mount it at /funnel-config so the full path becomes /api/v1/babblo/funnel-config.
```

---

### Prompt 6 — Filter Options & Events Endpoints

**Context:** Config endpoints are wired up. Now we add two lightweight endpoints that power the filter bar and step configurator dropdowns. These use the PostHog service we built in Prompt 2.

```
Add two more routes to the babblo router (packages/api/src/routes/babblo/):

Create packages/api/src/routes/babblo/funnelMeta.ts with:

GET /funnel-filter-options
  - Auth: sessionAuth
  - Calls posthogService.getDistinctVersions() and posthogService.getDistinctCountries() in parallel (Promise.all)
  - Apply a 5-second timeout to each (if either times out, return an empty array for that field and log the error)
  - Response: FunnelFilterOptions

GET /funnel-events
  - Auth: sessionAuth
  - Calls posthogService.getDistinctEvents()
  - Apply a 5-second timeout
  - On timeout/error: return { events: [] } and log server-side
  - Response: FunnelEventsResponse

Mount funnelMeta.ts routes in the babblo router:
  /funnel-filter-options → GET /api/v1/babblo/funnel-filter-options
  /funnel-events         → GET /api/v1/babblo/funnel-events

Important: these responses should be cached for 5 minutes server-side. Use a simple in-memory cache 
(a Map with { data, expiresAt } entries) — no Redis needed. Create a generic cache helper at 
packages/api/src/lib/simpleCache.ts:

  export function createCache<T>(ttlMs: number) {
    const store = new Map<string, { data: T; expiresAt: number }>();
    return {
      get(key: string): T | null { ... },
      set(key: string, data: T): void { ... },
    };
  }
```

---

### Prompt 7 — Main Funnel Endpoint

**Context:** We have the PostHog service, Google Ads service, config endpoints, and filter option endpoints. This is the core endpoint that fetches and assembles the full funnel response.

```
Create packages/api/src/routes/babblo/funnelData.ts

Add:

GET /funnel
  - Auth: sessionAuth
  - Query params:
      from        YYYY-MM-DD (required)
      to          YYYY-MM-DD (required, exclusive)
      versions    comma-separated version strings (optional)
      countries   comma-separated country names (optional)
      steps       comma-separated event names (required — the active visible steps from the configurator)

  - Validation:
      - from and to must be valid YYYY-MM-DD strings; return 400 if not
      - steps must be provided and non-empty; return 400 if not
      - from must be before or equal to to; return 400 if not

  - Logic:
    1. Parse versions (split by comma, filter empty), countries (same), steps (same).
    2. Remove 'installs' from the steps array before querying PostHog (it's not a PostHog event).
    3. Run in parallel (Promise.all with 15-second timeout each):
       a. googleAdsService.getInstallCount(from, to)  → installs: number | null
       b. If versions has 2+ entries:
            Run one posthogService.getFunnelCounts() per version (all in parallel), 
            PLUS one combined call with no version filter.
          If versions has 0 or 1 entry:
            Run one posthogService.getFunnelCounts() with the version filter (or no filter).
       
    4. Assemble FunnelResponse:
       - installs: from Google Ads (or null)
       - steps: for each event in the steps param (in order):
           all: the combined count
           versions: { '3.1.47': N, '3.1.45': N } only if 2+ versions selected
    
    5. Apply a 15-second overall timeout. If it triggers, return 504 with:
       { error: 'Request timed out. Try a shorter date range.' }

  - Response: FunnelResponse

  - Error handling:
    - PostHog failure: return 500 { error: 'Could not load funnel data from PostHog.' }
    - Google Ads failure: included as installs: null in the response (not a 500)
    - Log all external API errors server-side with context (date range, steps)

Mount this route in the babblo router:
  /funnel → GET /api/v1/babblo/funnel
```

---

### Prompt 8 — Frontend API Client & useBabbloFunnel Hook

**Context:** All backend endpoints are live. Now we wire up the frontend. The existing API client is at `packages/web/src/lib/api.ts` using a typed `request()` helper. We add babblo funnel calls there, then build a custom hook.

```
Step 1 — Add to packages/web/src/lib/api.ts:

Import the shared types:
  import type { FunnelResponse, FunnelConfigResponse, FunnelFilterOptions, FunnelEventsResponse } from '@persassistant/shared';

Add a new export object `babbloFunnel` alongside the existing api objects (notes, actions, etc.):

export const babbloFunnel = {
  getFunnel: (params: {
    from: string;
    to: string;
    versions?: string[];
    countries?: string[];
    steps: string[];
  }) => {
    const query = new URLSearchParams({
      from: params.from,
      to: params.to,
      steps: params.steps.join(','),
      ...(params.versions?.length ? { versions: params.versions.join(',') } : {}),
      ...(params.countries?.length ? { countries: params.countries.join(',') } : {}),
    });
    return request<FunnelResponse>(`/babblo/funnel?${query}`);
  },

  getFilterOptions: () => request<FunnelFilterOptions>('/babblo/funnel-filter-options'),
  getEvents: () => request<FunnelEventsResponse>('/babblo/funnel-events'),
  getConfig: () => request<FunnelConfigResponse>('/babblo/funnel-config'),
  saveConfig: (steps: FunnelConfigResponse['steps']) =>
    request<FunnelConfigResponse>('/babblo/funnel-config', {
      method: 'POST',
      body: JSON.stringify({ steps }),
    }),
};

---

Step 2 — Create packages/web/src/hooks/useBabbloFunnel.ts:

This hook manages all state for the Babblo Funnel page. It must expose:

  // Filter state
  dateFrom: string
  dateTo: string
  setDateRange(from: string, to: string): void
  activePreset: 'today' | 'yesterday' | '7d' | '30d' | 'custom'
  setPreset(preset): void

  // Version + geo filter state
  availableVersions: string[]
  selectedVersions: string[]
  setSelectedVersions(v: string[]): void
  availableCountries: string[]
  selectedCountries: string[]
  setSelectedCountries(c: string[]): void

  // Funnel config state
  allEvents: string[]           // Full list from PostHog (for configurator)
  configuredSteps: FunnelStep[] // Current step order + visibility
  setConfiguredSteps(steps: FunnelStep[]): void
  applyConfig(): void           // Saves config + triggers funnel fetch
  isSavingConfig: boolean

  // Funnel data
  funnelData: FunnelResponse | null
  loading: boolean
  error: string | null
  refetch(): void

Behaviour:
- On mount: fetch getFilterOptions(), getEvents(), and getConfig() in parallel.
- Merge getConfig() steps with allEvents from getEvents(): steps in saved config keep their order/visibility; new events from PostHog not in the saved config are appended (unchecked/visible: false).
- fetchFunnel() is called: on mount (after config loads), and whenever applyConfig() is called.
- fetchFunnel() only queries the visible steps (where visible === true), excluding 'installs' from the PostHog call.
- setPreset maps presets to UTC YYYY-MM-DD from/to strings:
    today:     today 00:00 UTC → tomorrow 00:00 UTC
    yesterday: yesterday → today
    7d:        7 days ago → tomorrow
    30d:       30 days ago → tomorrow
- activePreset resets to 'custom' when setDateRange is called directly.
- applyConfig(): calls saveConfig() (sets isSavingConfig true/false), then calls fetchFunnel().
- On saveConfig error: sets an error toast message (expose as configSaveError: string | null).
```

---

### Prompt 9 — Filter Bar Component

**Context:** The hook is ready. Now we build the filter bar UI component that sits at the top of the page.

```
Create packages/web/src/components/babblo/FunnelFilterBar.tsx

Props interface:
  activePreset: 'today' | 'yesterday' | '7d' | '30d' | 'custom'
  dateFrom: string
  dateTo: string
  onPresetChange(preset: string): void
  onDateRangeChange(from: string, to: string): void

  availableVersions: string[]
  selectedVersions: string[]
  onVersionsChange(versions: string[]): void

  availableCountries: string[]
  selectedCountries: string[]
  onCountriesChange(countries: string[]): void

UI requirements:
- Match the existing app's dark theme (slate-800/900 backgrounds, slate-300 text, cyan-500 accents)
- Date preset buttons: Today | Yesterday | Last 7 days | Last 30 days
  Active preset: cyan-500 background, white text
  Inactive: slate-700 background, slate-300 text
- Custom date range: two date <input type="date"> fields (from / to), visible inline after the preset buttons
  When a date input is changed, call onDateRangeChange and set preset to 'custom'
- Version multi-select: a dropdown button labelled "All versions" (or "3 versions" if some selected)
  Opens a dropdown list with checkboxes per version
  "Select all" / "Clear" actions at the top of the dropdown list
- Country multi-select: same pattern as version, labelled "All countries"
- On mobile (< md breakpoint): wrap filters to two rows if needed

Do not use any external component libraries — use plain Tailwind divs, inputs, and buttons, consistent 
with the existing UI components in packages/web/src/components/ui/.
```

---

### Prompt 10 — Step Configurator Component

**Context:** Filter bar is done. Now we build the right-panel step configurator with drag-to-reorder. The project already has `@dnd-kit/core` installed (used on the existing Babblo page).

```
Create packages/web/src/components/babblo/FunnelConfigurator.tsx

Props interface:
  steps: FunnelStep[]           // Current ordered steps with visibility
  allEvents: string[]           // Full event list from PostHog (to show unconfigured events)
  onChange(steps: FunnelStep[]): void
  onApply(): void
  isSaving: boolean

The component shows a vertically scrollable list of all events (configured steps first in their saved 
order, then any remaining allEvents not yet in steps appended at the bottom, unchecked).

Each row contains:
  - A drag handle icon (use GripVertical from lucide-react, already installed)
  - A checkbox (checked = visible: true)
  - The event name as plain text

Drag behaviour:
  - Use @dnd-kit/core: DndContext, SortableContext, useSortable
  - Dragging reorders the steps array (call onChange with new order)
  - The 'installs' row is always first and NOT draggable (render it as a fixed header row above the DndContext)
  - Works with both mouse (desktop) and touch (mobile) — use:
      sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor))
  - When a checkbox is toggled, call onChange with updated visible flag

At the bottom of the panel:
  - An "Apply" button: calls onApply(), disabled + shows spinner while isSaving is true
  - Style: cyan-500 background, full width, rounded

Panel styles:
  - Background: slate-800
  - Border: slate-700 border-l (left border separating it from the table)
  - Padding: p-4
  - Title: "Configure Steps" in slate-300 font-medium mb-3

Each row style:
  - Flex row, items-center, gap-2
  - Hover: slate-700 background
  - Dragging state: slate-600 background with opacity-50 on other items
  - Checkbox: accent-cyan-500
  - Event name: slate-300 text, text-sm, truncated with overflow-hidden

The component must be fully self-contained and not fetch any data itself — all data comes through props.
```

---

### Prompt 11 — Funnel Table Component

**Context:** Configurator is done. Now we build the funnel table — the main data display area.

```
Create packages/web/src/components/babblo/FunnelTable.tsx

Props interface:
  data: FunnelResponse | null
  steps: FunnelStep[]         // Used for row ordering and visibility
  loading: boolean
  error: string | null
  selectedVersions: string[]  // To know whether to show version columns

The table displays one row per visible step in the configured order.

Column structure:
  - If 0 or 1 versions selected: columns are [Event | Users | %]
  - If 2+ versions selected: columns are [Event | All Users | All % | v1 Users | v1 % | v2 Users | v2 % | ...]

Row rendering:
  1. First row is always "Installs (Google Ads)"
     - Users: data.installs ?? '—'
     - %: '100%' (it's the baseline) or '—' if installs is null
     - If installs is null: show a tooltip/title on the cell: "Install data unavailable"
  2. Subsequent rows: one per visible step (visible === true), in configured order
     - Users: data.steps.find(s => s.event === step.event)?.all ?? 0
     - %: installs > 0 ? ((users / installs) * 100).toFixed(1) + '%' : '—'
     - For version columns: data.steps.find(...)?.versions?.[version] ?? 0

Styling:
  - Table: w-full, text-sm, border-collapse
  - Header row: slate-700 background, slate-400 text, uppercase text-xs
  - Body rows: slate-800 background, slate-300 text, border-b border-slate-700
  - Hover: slate-750 (slate-700/50) background
  - Version column headers: show truncated version string (e.g. "3.1.47") in cyan-400
  - "All" combined column header: white text
  - % values: slate-400 text (secondary)
  - 0 user count: slate-500 text (dimmed but visible)
  - Installs row: slightly different background (slate-900) to distinguish it

Loading state:
  - Show 8 skeleton rows (animate-pulse, slate-700 background placeholder bars)
  - Show skeleton in each visible column

Error state:
  - Show a red-bordered alert box above the table:
    "Could not load funnel data. [Retry button]"
  - The Retry button calls a passed-in onRetry() prop

Empty state (data loaded but no steps visible):
  - "No steps configured. Enable steps in the configurator →"

The component must be fully presentational — no data fetching.
```

---

### Prompt 12 — Page Assembly & Sidebar Navigation

**Context:** All components and the hook are built. This final prompt wires everything together into the page and adds it to the sidebar.

```
Step 1 — Create the page at:
  packages/web/src/app/(pa)/babblo/funnel/page.tsx

It is a client component ('use client'). Follow the exact pattern of existing pages 
(e.g. packages/web/src/app/(pa)/pa/notes/page.tsx):
  - Wrap in <Layout> (handles auth + sidebar)
  - Use the useBabbloFunnel hook for all state
  - Compose the three components: FunnelFilterBar, FunnelTable, FunnelConfigurator

Page layout (Tailwind):
  <Layout>
    <div className="flex flex-col h-full">
      {/* Filter bar — full width at top */}
      <FunnelFilterBar ... />

      {/* Two-column body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main area — funnel table */}
        <div className="flex-1 overflow-auto p-6">
          {configSaveError && <Toast message={configSaveError} />}
          <FunnelTable
            data={funnelData}
            steps={configuredSteps}
            loading={loading}
            error={error}
            selectedVersions={selectedVersions}
            onRetry={refetch}
          />
        </div>

        {/* Right panel — configurator, fixed width */}
        <div className="w-72 shrink-0 border-l border-slate-700 overflow-auto">
          <FunnelConfigurator
            steps={configuredSteps}
            allEvents={allEvents}
            onChange={setConfiguredSteps}
            onApply={applyConfig}
            isSaving={isSavingConfig}
          />
        </div>
      </div>
    </div>
  </Layout>

On mobile (< md): the right panel (FunnelConfigurator) stacks below FunnelTable 
instead of appearing side-by-side. Use flex-col on mobile, flex-row on md+.

---

Step 2 — Add sidebar nav item:

In packages/web/src/components/layout/Sidebar.tsx, find the navItems array and add:

  { href: '/babblo/funnel', label: 'Babblo Funnel', icon: <BarChart2 size={18} /> }

(Use the BarChart2 icon from lucide-react, which is already installed.)

Place it after the existing "Babblo CRM" item if one exists, or after "Blog".

---

Step 3 — Toast component (if not already present):

Check if a Toast or notification component exists in packages/web/src/components/ui/.
If not, create a minimal one:

  packages/web/src/components/ui/Toast.tsx

  Props: { message: string; onDismiss?: () => void }
  Style: fixed bottom-4 right-4, bg-red-900 border border-red-700, text-red-200, 
         p-3 rounded-lg shadow-lg, text-sm, z-50
  Auto-dismiss after 4 seconds (useEffect with setTimeout).

---

Step 4 — Smoke test checklist:

After wiring everything, verify:
  [ ] Sidebar shows "Babblo Funnel" link and routes to /babblo/funnel
  [ ] Page loads with default steps and "Today" preset
  [ ] Funnel table renders install row + 8 event rows
  [ ] Switching to "Last 7 days" triggers a refetch and updates counts
  [ ] Selecting 2 versions renders side-by-side columns
  [ ] Dragging a step in the configurator reorders rows after Apply
  [ ] Unchecking a step and applying removes it from the table
  [ ] Refreshing the page restores the last saved configuration
  [ ] On mobile: configurator stacks below table; drag works with touch
  [ ] timcallagy@gmail.com events do not appear in counts
```

---

## Key Environment Variables Summary

Add these to `packages/api/.env` before starting:

```env
POSTHOG_API_KEY=<your_posthog_api_key>
POSTHOG_PROJECT_ID=100831
POSTHOG_BASE_URL=eu.posthog.com
GOOGLE_ADS_DEVELOPER_TOKEN=<from stats_api_keys/google_ads_token>
GOOGLE_ADS_CUSTOMER_ID=3307160609
GOOGLE_ADS_CLIENT_ID=<from client_secret JSON>
GOOGLE_ADS_CLIENT_SECRET=<from client_secret JSON>
GOOGLE_ADS_REFRESH_TOKEN=<from oauth token JSON>
```

---

## Implementation Order

Execute prompts strictly in sequence — each builds on the last:

| # | Prompt | Deliverable | Touches |
|---|---|---|---|
| 1 | DB Schema | Prisma model + migration | `packages/api/prisma/` |
| 2 | PostHog Service | HogQL query helper | `packages/api/src/services/` |
| 3 | Google Ads Service | Install count fetcher | `packages/api/src/services/` |
| 4 | Shared Types | TypeScript interfaces | `packages/shared/src/` |
| 5 | Config Endpoints | GET/POST funnel-config | `packages/api/src/routes/babblo/` |
| 6 | Meta Endpoints | filter-options + events | `packages/api/src/routes/babblo/` |
| 7 | Funnel Endpoint | Core data endpoint | `packages/api/src/routes/babblo/` |
| 8 | Hook + API Client | Frontend data layer | `packages/web/src/lib/`, `hooks/` |
| 9 | Filter Bar | Date/version/geo UI | `packages/web/src/components/babblo/` |
| 10 | Configurator | Draggable step list | `packages/web/src/components/babblo/` |
| 11 | Funnel Table | Data display | `packages/web/src/components/babblo/` |
| 12 | Page + Nav | Full assembly | `packages/web/src/app/`, `Sidebar.tsx` |
