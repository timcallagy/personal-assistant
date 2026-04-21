# Babblo Funnel — Implementation Checklist

## Phase 1 — Data Layer

### Step 1: Prisma Schema ✅
- [x] Add `BabbloFunnelConfig` model to `packages/api/prisma/schema.prisma`
- [x] Add reverse relation `babbloFunnelConfig BabbloFunnelConfig?` to `User` model
- [x] Migration file created at `prisma/migrations/20260421000000_add_babblo_funnel_config/`
- [x] Prisma client regenerated successfully
- [ ] Run migration on Render (auto-runs via `db:push` on deploy)

### Step 2: PostHog Service ✅
- [x] Created `packages/api/src/services/posthog.ts`
- [x] Added `POSTHOG_API_KEY`, `POSTHOG_PROJECT_ID`, `POSTHOG_BASE_URL` to `.env`
- [x] `hogql(query)` helper exported
- [x] `EXCLUDE_FILTER` constant exported
- [x] `getFunnelCounts()` exported
- [x] `getDistinctEvents()` exported
- [x] `getDistinctVersions()` exported
- [x] `getDistinctCountries()` exported

### Step 3: Google Ads Service ✅
- [x] `google-ads-api` installed in `packages/api`
- [x] Created `packages/api/src/services/googleAds.ts`
- [x] All Google Ads env vars added to `.env`
- [x] `getInstallCount(dateFrom, dateTo)` exported
- [x] API errors return `null` gracefully

---

## Phase 2 — Backend API

### Step 4: Shared Types ✅
- [x] `FunnelStep` added to `packages/shared/src/index.ts`
- [x] `VersionCounts` added
- [x] `FunnelRow` added
- [x] `FunnelResponse` added
- [x] `FunnelFilterOptions` added
- [x] `FunnelEventsResponse` added
- [x] `FunnelConfigResponse` added
- [x] Shared package builds cleanly

### Step 5: Config Endpoints ✅
- [x] `packages/api/src/lib/simpleCache.ts` created
- [x] `GET /babblo/funnel-config` added
- [x] `POST /babblo/funnel-config` added (with validation)
- [x] Default 9 steps defined as constant
- [x] Wired into `babbloRouter`

### Step 6: Meta Endpoints ✅
- [x] `GET /babblo/funnel-events` added (5-min cached)
- [x] `GET /babblo/funnel-filter-options` added (5-min cached)
- [x] Both degrade gracefully on timeout/error
- [x] Wired into `babbloRouter`

### Step 7: Funnel Endpoint ✅
- [x] `GET /babblo/funnel` added
- [x] Input validation (from, to, steps)
- [x] Parallel PostHog + Google Ads fetch
- [x] Side-by-side version column support
- [x] 15-second timeout → 504
- [x] Google Ads failure → `installs: null`
- [x] Wired into `babbloRouter`

---

## Phase 3 — Frontend

### Step 8: API Client & Hook ✅
- [x] `babbloFunnel` object added to `packages/web/src/lib/api.ts`
- [x] `useBabbloFunnel` hook created
- [x] Preset → UTC date range logic
- [x] Config merge (new events appended unchecked)
- [x] `applyConfig()` saves then fetches
- [x] `configSaveError` exposed

### Step 9: Filter Bar Component ✅
- [x] `FunnelFilterBar.tsx` created
- [x] Date preset buttons with active styling
- [x] Custom from/to date inputs
- [x] Version multi-select dropdown (Select All / Clear)
- [x] Country multi-select dropdown (Select All / Clear)

### Step 10: Step Configurator ✅
- [x] `FunnelConfigurator.tsx` created
- [x] `@dnd-kit/sortable` installed
- [x] dnd-kit drag-to-reorder (PointerSensor + TouchSensor)
- [x] Checkbox toggle per step
- [x] `installs` row pinned at top, not draggable
- [x] Apply button with loading spinner

### Step 11: Funnel Table ✅
- [x] `FunnelTable.tsx` created
- [x] Single + multi-version column modes
- [x] Installs row as baseline (100%)
- [x] % calculated from installs
- [x] 0-count rows shown (not hidden)
- [x] Loading skeleton rows (animate-pulse)
- [x] Error state with Retry button
- [x] Empty state message

### Step 12: Page & Navigation ✅
- [x] `packages/web/src/app/(pa)/babblo/funnel/page.tsx` created
- [x] Desktop two-column layout (table left, configurator right w-72)
- [x] Mobile stacked layout (md:flex-row)
- [x] `Toast` component created and exported from ui/index.ts
- [x] `configSaveError` wired to Toast
- [x] `{ href: '/babblo/funnel', label: 'Babblo Funnel', icon: '📈' }` added to Sidebar

---

## Deploy
- [x] `render.yaml` updated with 9 new env vars (sync: false — set manually in Render dashboard)
- [ ] Set env vars in Render dashboard for `pa-api`:
  - [ ] POSTHOG_API_KEY
  - [ ] POSTHOG_PROJECT_ID
  - [ ] POSTHOG_BASE_URL
  - [ ] GOOGLE_ADS_DEVELOPER_TOKEN
  - [ ] GOOGLE_ADS_CUSTOMER_ID
  - [ ] GOOGLE_ADS_CLIENT_ID
  - [ ] GOOGLE_ADS_CLIENT_SECRET
  - [ ] GOOGLE_ADS_REFRESH_TOKEN
- [ ] Deploy to Render
- [ ] Confirm migration ran (`babblo_funnel_configs` table exists)

---

## Final QA
- [ ] Sidebar shows "Babblo Funnel" and routes to `/babblo/funnel`
- [ ] Page loads with default 9 steps and Today preset
- [ ] Install row renders (or shows `—` gracefully)
- [ ] Last 7 days preset triggers refetch
- [ ] Selecting 2 versions shows side-by-side columns
- [ ] Drag + Apply reorders funnel rows
- [ ] Uncheck + Apply hides row
- [ ] Config persists after page reload
- [ ] Mobile layout correct (configurator below table)
- [ ] Touch drag works on mobile
- [ ] `timcallagy@gmail.com` excluded from all counts
- [ ] `androidTest1@test.com` excluded from all counts
