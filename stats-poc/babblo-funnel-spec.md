# Babblo Funnel — Developer Specification

## 1. Overview

Add a **Babblo Funnel** page to the Personal Assistant web app. The page gives Tim a real-time view of the Babblo app's onboarding funnel, sourcing data from PostHog (EU) for event counts and Google Ads for install counts. It supports filtering by date range, app version, and country, with a persistent, configurable step list.

---

## 2. Navigation

- Add **"Babblo Funnel"** as a new item in the existing sidebar menu.
- Clicking it routes to `/babblo-funnel` (or equivalent route in the existing routing convention).
- The page is only accessible to authenticated users (same auth as the rest of the Personal Assistant).

---

## 3. Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Filter Bar (date range | version multi-select | geo multi) │
├──────────────────────────────────┬──────────────────────────┤
│                                  │                          │
│         Funnel Table             │   Step Configurator      │
│         (main area)              │   (right panel)          │
│                                  │                          │
└──────────────────────────────────┴──────────────────────────┘
```

- Filter bar is always visible at the top.
- Two-column layout below: funnel table (main/left), step configurator (right, always visible — not collapsible).
- Responsive: on mobile, the step configurator stacks below the funnel table.

---

## 4. Filter Bar

Three filters displayed inline:

### 4.1 Date Range
- Preset buttons: **Today**, **Yesterday**, **Last 7 days**, **Last 30 days**
- Plus a **custom date range picker** (start date / end date).
- Default on first load: **Today**.
- Dates are always passed to PostHog as UTC (`YYYY-MM-DD`).

### 4.2 App Version (multi-select)
- Populated dynamically by querying PostHog for all distinct `app_version` values seen in the last 90 days:
  ```sql
  SELECT DISTINCT JSONExtractString(properties, 'app_version') AS version
  FROM events
  WHERE timestamp >= now() - INTERVAL 90 DAY
    AND JSONExtractString(properties, 'app_version') != ''
  ORDER BY version DESC
  ```
- Displayed as a multi-select dropdown, versions sorted descending (newest first).
- Default: **all versions selected** (combined view).
- When 2+ specific versions are selected: funnel table renders **one column per version** plus an **"All" combined column**.
- When all versions selected or only one selected: single combined column.

### 4.3 Country (multi-select)
- Populated dynamically by querying PostHog for all distinct `$geoip_country_name` values:
  ```sql
  SELECT DISTINCT JSONExtractString(properties, '$geoip_country_name') AS country
  FROM events
  WHERE timestamp >= now() - INTERVAL 90 DAY
    AND JSONExtractString(properties, '$geoip_country_name') != ''
  ORDER BY country ASC
  ```
- Default: **all countries** (no filter applied).
- Country filter is always applied as a combined filter — never side-by-side columns.
- When filtering by country, add to all PostHog queries:
  ```sql
  AND JSONExtractString(properties, '$geoip_country_name') IN ('Country A', 'Country B')
  ```

---

## 5. Funnel Table

### 5.1 Structure
- **Rows**: One per active funnel step (in configured order). First row is always Installs.
- **Columns**: Depends on version selection:
  - All versions (default): single `Users` + `%` column pair.
  - 2+ specific versions selected: one column pair per version + one "All" combined column pair.
- Each column pair shows: **unique user count** + **% of installs**.

### 5.2 Install Row
- Source: Google Ads API (`metrics.conversions` from `campaign` report for the selected date range).
- Displayed as the first row, labelled **"Installs (Google Ads)"**.
- Install count is **identical across all version columns** (Google Ads data is not broken down by app version).
- Install count is the **denominator** for all percentage calculations.
- If Google Ads returns 0 installs for the period, show 0 and render all percentages as `—`.

### 5.3 Event Rows
- Each active step shows the count of **distinct `person_id`** values who triggered that event within the selected date range and filters.
- PostHog HogQL query pattern per step:
  ```sql
  SELECT count(distinct person_id) AS users
  FROM events
  WHERE event = '<event_name>'
    AND timestamp >= '<from>'
    AND timestamp < '<to>'
    AND person.properties.$email NOT IN ('timcallagy@gmail.com', 'androidTest1@test.com')
    [AND JSONExtractString(properties, 'app_version') IN (...) -- if version filter active]
    [AND JSONExtractString(properties, '$geoip_country_name') IN (...) -- if geo filter active]
  ```
- Steps with 0 users show **0** (not hidden).
- Percentage = `(step_users / installs) * 100`, rounded to 1 decimal place.
- If installs = 0, percentage displays as `—`.

### 5.4 Query Efficiency
- Batch all active step queries into a **single HogQL query** using conditional aggregation rather than N separate requests:
  ```sql
  SELECT
    event,
    count(distinct person_id) AS users
  FROM events
  WHERE event IN ('Event A', 'Event B', ...)
    AND timestamp >= '<from>'
    AND timestamp < '<to>'
    AND person.properties.$email NOT IN ('timcallagy@gmail.com', 'androidTest1@test.com')
    [AND version/geo filters]
  GROUP BY event
  ```
- For side-by-side version columns, run one query per version (parallelised with `Promise.all`).
- Google Ads and PostHog requests run in **parallel**.

---

## 6. Step Configurator (Right Panel)

### 6.1 Behaviour
- Lists **all PostHog event names** fetched once on page load:
  ```sql
  SELECT DISTINCT event, count() AS total
  FROM events
  WHERE timestamp >= now() - INTERVAL 90 DAY
  ORDER BY total DESC
  ```
- Each item has:
  - A **checkbox** (checked = visible in funnel table, unchecked = hidden)
  - A **drag handle** for reordering
  - The **event name** as plain text
- Dragging reorders steps; works on both desktop (mouse) and mobile (touch).
- An **Apply** button at the bottom of the panel triggers a data refresh with the current configuration.
- Changes to configuration do **not** auto-trigger a fetch — only Apply does.

### 6.2 Default Configuration
Pre-populated on first load (in this order, all checked):

| # | Event Name |
|---|---|
| 1 | Installs (Google Ads) — special non-PostHog row, always first, not draggable |
| 2 | App Opened |
| 3 | Onboarding Started |
| 4 | Target Language Selected |
| 5 | Onboarding Topics Viewed |
| 6 | Onboarding Topic Selected |
| 7 | Sign Up Attempted |
| 8 | Login Attempted |
| 9 | call_started |

### 6.3 Persistence
- Configuration (step order + checkbox state) is saved to the **database** against the user's account, not localStorage, so it persists across devices.
- Save triggered on every Apply press (not on every drag/toggle).
- On page load, fetch saved configuration from DB and merge with the live event list from PostHog (new events not in the saved config appear at the bottom, unchecked).

---

## 7. Data Sources

### 7.1 PostHog
- **Endpoint**: `POST https://eu.posthog.com/api/projects/{PROJECT_ID}/query/`
- **Auth**: Bearer token (store as server-side environment variable — never expose to client)
- **Query type**: `HogQLQuery`
- **Project ID**: `100831`
- All PostHog requests must be made **server-side** (API route / backend) to protect the API key.

### 7.2 Google Ads
- **Library**: `google-ads-api` Node.js client
- **Customer ID**: `3307160609`
- **Query**: `metrics.conversions` from `campaign` report, segmented by `segments.date`, summed across campaigns for the date range.
- Credentials loaded from server-side environment (developer token, OAuth refresh token, client credentials).
- For custom date ranges, use `segments.date BETWEEN '<from>' AND '<to>'`.
- For presets, map to explicit date ranges (avoid `DURING` clauses for reliability).

---

## 8. API Routes

Follow existing Personal Assistant API conventions for auth, response format, and error codes.

### `GET /api/babblo/funnel`
Query params:
- `from` — `YYYY-MM-DD` (UTC, inclusive)
- `to` — `YYYY-MM-DD` (UTC, exclusive)
- `versions[]` — array of version strings (optional; omit for all)
- `countries[]` — array of country names (optional; omit for all)
- `steps[]` — ordered array of active event names to query

Response:
```json
{
  "installs": 34,
  "steps": [
    {
      "event": "App Opened",
      "all": 44,
      "versions": { "3.1.47": 30, "3.1.45": 14 }
    },
    {
      "event": "Onboarding Started",
      "all": 43,
      "versions": { "3.1.47": 29, "3.1.45": 14 }
    }
  ]
}
```
- `versions` map is only present when version filter is active.
- `installs` is `null` if Google Ads request failed (funnel data still returned).

### `GET /api/babblo/events`
Returns all distinct PostHog event names from the last 90 days.

Response:
```json
{
  "events": ["App Opened", "Onboarding Started", "call_started"]
}
```

### `GET /api/babblo/filter-options`
Returns distinct versions and countries for filter dropdowns.

Response:
```json
{
  "versions": ["3.1.47", "3.1.46", "3.1.45"],
  "countries": ["Bangladesh", "India", "Saudi Arabia"]
}
```

### `GET /api/babblo/config`
Returns the authenticated user's saved step configuration.

Response:
```json
{
  "steps": [
    { "event": "App Opened", "visible": true },
    { "event": "call_started", "visible": false }
  ]
}
```

### `POST /api/babblo/config`
Saves the authenticated user's step configuration.

Body:
```json
{
  "steps": [
    { "event": "App Opened", "visible": true },
    { "event": "call_started", "visible": false }
  ]
}
```

---

## 9. Database Schema

Add one table (adapt to existing DB convention — SQL shown for reference):

```sql
CREATE TABLE babblo_funnel_config (
  user_id     TEXT PRIMARY KEY,
  steps       JSONB NOT NULL,       -- ordered array of { event: string, visible: boolean }
  updated_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## 10. Test User Exclusion

All PostHog queries must include the following filter, defined as a server-side constant:

```js
const EXCLUDE_EMAILS = ['timcallagy@gmail.com', 'androidTest1@test.com'];
const EXCLUDE_FILTER = `AND person.properties.$email NOT IN (${EXCLUDE_EMAILS.map(e => `'${e}'`).join(', ')})`;
```

**Note**: Pre-login anonymous sessions for excluded users may still appear until sign-in occurs. Acceptable for now.

---

## 11. Error Handling

| Scenario | Behaviour |
|---|---|
| PostHog API timeout / 5xx | Error banner: "Could not load funnel data." with a Retry button. |
| Google Ads API failure | Installs row shows `—` with tooltip: "Install data unavailable." Funnel rows still render. |
| PostHog returns 0 for a step | Show 0 in the table — not an error state. |
| Filter options fail to load | Empty dropdowns with inline error message. Does not block the rest of the page. |
| Saved config fails to load | Fall back to default configuration silently. |
| Saved config fails to save | Non-blocking toast: "Failed to save configuration." |
| Network offline | Full-page error state with Retry button. |

All API errors should be logged server-side.

---

## 12. Performance Considerations

- Cache `/api/babblo/filter-options` and `/api/babblo/events` for **5 minutes** server-side.
- Do **not** cache `/api/babblo/funnel` — data must always be live.
- PostHog and Google Ads requests inside `/api/babblo/funnel` run in **parallel** (`Promise.all`).
- For side-by-side version queries, run all version PostHog queries in parallel.
- Apply a **15-second server-side timeout** on all external API calls; surface as an error if exceeded.

---

## 13. Testing Plan

### Unit Tests
- Percentage calculation: `(users / installs) * 100` rounds to 1 decimal; handles `installs = 0` → `—`.
- Date range mapping: each preset (Today, Yesterday, Last 7 days, Last 30 days) maps to correct UTC `from`/`to` strings.
- Config merge: new PostHog events not present in saved config appear at the bottom, unchecked.
- EXCLUDE_FILTER: confirm the constant is applied in every PostHog query helper function.

### Integration Tests
- `GET /api/babblo/funnel` with valid params returns correctly shaped response.
- `GET /api/babblo/funnel` when Google Ads fails returns `installs: null` but still returns funnel step data.
- `GET /api/babblo/funnel` when PostHog fails returns a 500 with appropriate error message.
- `POST /api/babblo/config` then `GET /api/babblo/config` returns the same steps array.
- Version filter: passing `versions=["3.1.47"]` scopes PostHog queries correctly.
- Geo filter: passing `countries=["Saudi Arabia"]` scopes PostHog queries correctly.
- Excluded emails: events from `timcallagy@gmail.com` and `androidTest1@test.com` do not appear in results.

### End-to-End Tests
- Page loads with default config and Today preset; install row and all 8 default event rows render.
- Switching date preset triggers a data refresh and table updates.
- Selecting two specific versions renders side-by-side columns plus an "All" column.
- Deselecting all version filters reverts to single combined column.
- Dragging a step in the configurator and pressing Apply reorders the funnel table rows.
- Unchecking a step and pressing Apply removes that row from the table.
- Configuration persists after a full page reload.
- On mobile: drag-to-reorder works with touch events; configurator panel stacks below the table.

### Manual QA Checklist
- [ ] `timcallagy@gmail.com` test events do not appear in any funnel counts
- [ ] `androidTest1@test.com` test events do not appear in any funnel counts
- [ ] Install row value matches Google Ads dashboard for the same date range
- [ ] PostHog unique user counts match `node today.js` output for the same date range
- [ ] Steps with 0 count are visible in the table (not hidden)
- [ ] Custom date range picker passes dates correctly in UTC
- [ ] "All" combined column matches the sum expectation across selected versions
- [ ] Google Ads failure degrades gracefully — funnel rows still render

---

## 14. Out of Scope (v1)
- Organic / App Store install tracking
- Proactive alerts or notifications
- Device ID-based test user exclusion
- Display name mapping for raw PostHog event names
- Editable test user exclusion list via UI
