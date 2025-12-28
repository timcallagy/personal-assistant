# Job Search UI - Implementation Prompt Plan

> **Spec Reference**: `/docs/specs/job-search-ui-spec.md`
> **Date**: 2025-12-28
> **Estimated Prompts**: 18

---

## Overview

This document contains a series of prompts for implementing the Job Search UI feature. Each prompt is designed to:

1. Build incrementally on previous work
2. Produce working, integrated code at each step
3. Be small enough to review safely
4. Be large enough to show meaningful progress

### Dependency Graph

```
Layer 1: API Types & Functions
    ↓
Layer 2: Data Hooks (useJobStats → useJobProfile → useCompanies → useJobs)
    ↓
Layer 3: Atomic UI Components (MatchScoreBadge, TagInput, CrawlProgressIndicator)
    ↓
Layer 4: Entity Components (StatsBar, JobCard, CompanyCard, JobFilters, Modal)
    ↓
Layer 5: Section Components (TopJobsSection, CompanyPanel, JobsPanel)
    ↓
Layer 6: Pages (Preferences → Main Jobs)
    ↓
Layer 7: Navigation Integration
```

---

## Phase 1: API Foundation

### Prompt 1.1: Job Tracker Types

**Goal**: Add all TypeScript types for the job tracker feature to the API module.

**Context**: The web app uses a central `api.ts` file for all API communication. Types are defined inline in this file. The job tracker backend already exists with endpoints under `/api/v1/jobs/`.

```text
Add TypeScript types for the job tracker feature to packages/web/src/lib/api.ts.

Add these types after the existing blog types section:

1. JobStatus type: 'new' | 'viewed' | 'applied' | 'dismissed'
2. AtsType type: 'greenhouse' | 'lever' | 'ashby' | 'smartrecruiters' | 'workday' | 'custom'

3. Company interface with fields:
   - id: number
   - name: string
   - careerPageUrl: string
   - atsType: AtsType | null
   - active: boolean
   - createdAt: string
   - updatedAt: string

4. JobListing interface with fields:
   - id: number
   - companyId: number
   - companyName?: string
   - externalId: string
   - title: string
   - url: string
   - location: string | null
   - remote: boolean
   - department: string | null
   - description: string | null
   - salaryRange?: string | null
   - postedAt: string | null
   - firstSeenAt: string
   - lastSeenAt: string
   - status: JobStatus
   - matchScore: number | null

5. JobProfile interface with fields:
   - id: number
   - keywords: string[]
   - titles: string[]
   - locations: string[]
   - remoteOnly: boolean
   - createdAt: string
   - updatedAt: string

6. CrawlLog interface with fields:
   - id: number
   - companyId: number
   - companyName?: string
   - startedAt: string
   - completedAt: string | null
   - status: 'running' | 'success' | 'failed'
   - jobsFound: number
   - newJobs: number
   - error: string | null

7. JobStats interface with fields:
   - totalJobs: number
   - totalCompanies: number
   - newSinceLastRefresh: number
   - applicationsSubmitted: number
   - lastRefreshAt: string | null

8. Filter interfaces:
   - JobListingsFilter: companyId?, status?, minScore?, limit?, offset?, locationInclude?: string[], locationExclude?: string[]
   - CompaniesFilter: activeOnly?: boolean

9. Response interfaces:
   - CompaniesResponse: { companies: Company[], total: number }
   - JobListingsResponse: { listings: JobListing[], total: number, limit: number, offset: number }
   - JobProfileResponse: { profile: JobProfile | null }
   - CrawlResponse: { crawlId: number, companiesCrawled: number, totalJobsFound: number, newJobsFound: number }
   - CrawlLogsResponse: { logs: CrawlLog[], total: number }

Add a section comment "// ============================================" and "// Job Tracker Types" to organize them clearly.

Do not add API functions yet - that will be the next step.
```

---

### Prompt 1.2: Job Tracker API Functions

**Goal**: Add the API module with all endpoint functions.

**Context**: This builds on the types added in Prompt 1.1. Follow the existing pattern in `api.ts` where API functions are organized into namespace objects (like `notes`, `actions`, `blogPosts`).

```text
Add a `jobs` API module to packages/web/src/lib/api.ts after the blogImages module.

The module should follow the existing pattern (namespace object with async methods). All endpoints are under /jobs/.

Implement these methods:

Companies:
- listCompanies(filters?: CompaniesFilter): GET /jobs/companies
  - Build query params from filters.activeOnly if provided
  - Return CompaniesResponse

- getCompany(id: number): GET /jobs/companies/:id
  - Return Company

Listings:
- listJobs(filters?: JobListingsFilter): GET /jobs/listings
  - Build query params: companyId, status, minScore, limit, offset
  - For locationInclude/locationExclude arrays, join with comma
  - Return JobListingsResponse

- getJob(id: number): GET /jobs/listings/:id
  - Return JobListing

- updateJobStatus(id: number, status: JobStatus): PUT /jobs/listings/:id/status
  - Send { status } as JSON body
  - Return JobListing

- batchUpdateStatus(ids: number[], status: JobStatus): PUT /jobs/listings/batch-status
  - Send { ids, status } as JSON body
  - Return { updated: number }

- getStats(): GET /jobs/listings/stats
  - Return JobStats

Profile:
- getProfile(): GET /jobs/profile
  - Return JobProfileResponse

- updateProfile(data): PUT /jobs/profile
  - data is Partial<Omit<JobProfile, 'id' | 'createdAt' | 'updatedAt'>>
  - Send as JSON body
  - Return JobProfile

Crawling:
- crawlAll(): POST /jobs/crawl/all
  - Return CrawlResponse

- crawlCompany(companyId: number): POST /jobs/crawl/:companyId
  - Return CrawlResponse

- getCrawlLogs(limit?: number): GET /jobs/crawl/logs
  - Add ?limit=X if limit provided
  - Return CrawlLogsResponse

Use the existing `request<T>` helper function for all API calls.
```

---

## Phase 2: Data Hooks

### Prompt 2.1: useJobStats Hook

**Goal**: Create the simplest hook first - statistics fetching.

**Context**: Follow the pattern established in `useNotes.ts` and `useActions.ts`. Hooks live in `packages/web/src/hooks/`.

```text
Create a new hook at packages/web/src/hooks/useJobStats.ts for fetching job statistics.

Follow the existing hook patterns in this codebase (see useNotes.ts for reference).

The hook should:
1. Import JobStats from '@/lib/api' and the jobs API module
2. Manage state: stats (JobStats | null), loading (boolean), error (string | null)
3. Fetch stats on mount using useEffect
4. Provide a refresh() function to re-fetch

Return interface:
{
  stats: JobStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

Implementation details:
- Use useCallback for the fetch function
- Set loading true before fetch, false in finally
- Clear error before each fetch attempt
- Catch errors and set error message (check for ApiError type)
- Auto-fetch on mount with useEffect

Export the hook as a named export.
```

---

### Prompt 2.2: useJobProfile Hook

**Goal**: Create the job profile hook with read and update capabilities.

**Context**: This hook manages the user's job search preferences. It needs both fetch and save functionality.

```text
Create a new hook at packages/web/src/hooks/useJobProfile.ts for managing the job search profile.

The hook should manage:
- profile: JobProfile | null
- loading: boolean (for initial fetch)
- error: string | null (for fetch errors)
- saving: boolean (for save operations)
- saveError: string | null (for save errors)

Implement these functions:
1. fetchProfile(): Fetches the profile on mount
2. updateProfile(data): Updates the profile with partial data

Return interface:
{
  profile: JobProfile | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  saveError: string | null;
  refresh: () => Promise<void>;
  updateProfile: (data: Partial<Omit<JobProfile, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
}

Implementation details:
- Auto-fetch on mount
- updateProfile should:
  - Set saving=true, clear saveError
  - Call jobs.updateProfile(data)
  - Update local profile state with response
  - Set saving=false in finally
  - Catch and set saveError on failure
- Use useCallback for both functions

Import types and API from '@/lib/api'.
```

---

### Prompt 2.3: useCompanies Hook

**Goal**: Create the companies hook with crawl functionality.

**Context**: This hook manages the list of tracked companies and handles crawling operations. It needs to track which company (or all) is currently being crawled.

```text
Create a new hook at packages/web/src/hooks/useCompanies.ts for managing tracked companies.

The hook should manage:
- companies: Company[]
- loading: boolean
- error: string | null
- crawlingCompanyId: number | null (which company is being crawled)
- crawlingAll: boolean (is a full crawl in progress)

Implement these functions:
1. fetchCompanies(): Fetches all companies
2. refresh(): Alias for fetchCompanies
3. crawlCompany(id: number): Crawl a specific company
4. crawlAll(): Crawl all active companies

Return interface:
{
  companies: Company[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  crawlCompany: (id: number) => Promise<CrawlResponse>;
  crawlAll: () => Promise<CrawlResponse>;
  crawlingCompanyId: number | null;
  crawlingAll: boolean;
}

Implementation details:
- Auto-fetch on mount
- crawlCompany should:
  - Set crawlingCompanyId to the id
  - Call jobs.crawlCompany(id)
  - Set crawlingCompanyId to null in finally
  - Return the CrawlResponse
- crawlAll should:
  - Set crawlingAll to true
  - Call jobs.crawlAll()
  - Set crawlingAll to false in finally
  - Return the CrawlResponse
- After successful crawl, automatically refresh the companies list
- Use useCallback for all functions

Import types and API from '@/lib/api'.
```

---

### Prompt 2.4: useJobs Hook

**Goal**: Create the main jobs hook with filtering, pagination, and status updates.

**Context**: This is the most complex hook. It manages job listings with infinite scroll support and status update actions.

```text
Create a new hook at packages/web/src/hooks/useJobs.ts for managing job listings.

The hook should accept options:
{
  initialFilters?: JobListingsFilter;
  autoFetch?: boolean; // default true
}

Manage this state:
- jobs: JobListing[]
- total: number
- loading: boolean (initial load)
- loadingMore: boolean (infinite scroll)
- error: string | null
- filters: JobListingsFilter
- offset: number (internal, for pagination)

Constants:
- LIMIT = 20 (items per page)

Implement these functions:
1. fetchJobs(isLoadMore?: boolean): Core fetch function
2. setFilters(filters): Update filters (triggers re-fetch)
3. refresh(): Re-fetch from beginning
4. loadMore(): Fetch next page (infinite scroll)
5. markApplied(id: number): Update job status to 'applied'
6. markDismissed(id: number): Update job status to 'dismissed'

Return interface:
{
  jobs: JobListing[];
  total: number;
  loading: boolean;
  error: string | null;
  filters: JobListingsFilter;
  setFilters: (filters: JobListingsFilter) => void;
  refresh: () => Promise<void>;
  markApplied: (id: number) => Promise<void>;
  markDismissed: (id: number) => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  loadingMore: boolean;
}

Implementation details:
- fetchJobs logic:
  - If isLoadMore: set loadingMore=true, use current offset
  - If not isLoadMore: set loading=true, reset offset to 0
  - Call jobs.listJobs with filters + limit + offset
  - If isLoadMore: append to jobs array
  - If not: replace jobs array
  - Update total and offset
  - Clear error before fetch, set on failure
- Re-fetch when filters change (useEffect dependency)
- markApplied: call updateJobStatus, then update local state (change status)
- markDismissed: call updateJobStatus, then remove from local array and decrement total
- hasMore = jobs.length < total

Import types and API from '@/lib/api'.
```

---

## Phase 3: Atomic UI Components

### Prompt 3.1: MatchScoreBadge Component

**Goal**: Create a reusable badge component for displaying match scores with color coding.

**Context**: This is a simple presentation component. It displays a percentage with color based on thresholds: green (70%+), yellow (40-69%), red (<40%).

```text
Create a new component at packages/web/src/components/jobs/MatchScoreBadge.tsx.

First, create the jobs components directory if it doesn't exist.

The component displays a match score as a colored percentage badge.

Props interface:
{
  score: number;
  size?: 'sm' | 'md'; // default 'md'
}

Color logic:
- score >= 70: green (use text-success from tailwind config)
- score >= 40: yellow (use text-warning)
- score < 40: red (use text-error)

Also create a helper function getMatchScoreLevel(score: number) that returns:
{ level: 'high' | 'medium' | 'low', color: string, label: string }

The component should:
- Render a <span> with rounded-full styling
- Show score with % suffix (e.g., "85%")
- Apply appropriate text color class
- Add background with opacity (e.g., bg-success/20 for green)
- Size 'sm': px-2 py-0.5 text-xs
- Size 'md': px-3 py-1 text-sm
- Include title attribute with label (e.g., "High Match")
- Use font-medium

Export both the component and the helper function.
```

---

### Prompt 3.2: TagInput Component

**Goal**: Create a tag-style input for the job preferences form.

**Context**: This allows users to add/remove keywords, job titles, and locations as tags. Similar to a multi-select but with free-form text input.

```text
Create a new component at packages/web/src/components/jobs/TagInput.tsx.

This is a tag-style input where users can type text and press Enter to add tags, and click X to remove them.

Props interface:
{
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  error?: string;
}

Component structure:
1. Label at top (use same styling as Input component's label)
2. Container div with border (similar to input styling from the design system)
3. Inside container:
   - Flex wrap of existing tags as badges
   - Each tag shows text + X button to remove
   - Text input at the end (no border, grows to fill)

Behavior:
- On Enter key: trim input, if not empty and not duplicate, add to values array, clear input
- On X click: remove that value from array
- On Backspace with empty input: remove last tag (optional nice-to-have)

Styling:
- Container: rounded-md border border-background-tertiary bg-background p-2 focus-within:border-accent
- Tags: inline-flex items-center gap-1 rounded bg-accent/20 px-2 py-1 text-sm text-foreground
- X button: hover:text-error cursor-pointer
- Input: flex-1 min-w-[120px] bg-transparent outline-none text-foreground placeholder:text-foreground-muted
- Error: text-error text-sm mt-1

Add data-testid attributes:
- Container: "{label.toLowerCase()}-input" (e.g., "keywords-input")
- Each tag: "{label.toLowerCase()}-tag"
- Remove button: "remove-tag"
```

---

### Prompt 3.3: CrawlProgressIndicator Component

**Goal**: Create a simple progress indicator shown during crawl operations.

**Context**: This displays a spinner with optional progress text when crawling is in progress.

```text
Create a new component at packages/web/src/components/jobs/CrawlProgressIndicator.tsx.

This shows a loading indicator during crawl operations.

Props interface:
{
  isRunning: boolean;
  message?: string; // e.g., "Crawling 5 of 12 companies..."
}

Component:
- If !isRunning, return null
- Display a flex container with:
  - Spinning SVG icon (use the same spinner as Button component's loading state)
  - Text message (default: "Crawling jobs...")
  - Use text-accent color for spinner, text-foreground-secondary for message

Styling:
- Container: flex items-center gap-2 p-3 bg-background-secondary rounded-md
- Spinner: h-5 w-5 animate-spin
- Text: text-sm

Add data-testid="crawl-progress"
```

---

## Phase 4: Entity Components

### Prompt 4.1: StatsBar Component

**Goal**: Create the statistics bar that displays at the top of the Jobs page.

**Context**: Shows summary stats in a single row. Uses the JobStats type from the API.

```text
Create a new component at packages/web/src/components/jobs/StatsBar.tsx.

This displays job statistics in a horizontal bar.

Props interface:
{
  stats: JobStats | null;
  loading: boolean;
}

Display format:
"156 Jobs • 24 Companies • 12 New • 3 Applied • Last: 2h ago"

Component logic:
- If loading: show "Loading statistics..."
- If no stats: show nothing or "No statistics available"
- Format lastRefreshAt as relative time (e.g., "2h ago", "Yesterday", "Never")
  - Create a helper function formatRelativeTime(dateString: string | null): string
  - Use simple logic: < 1 hour = "Xm ago", < 24 hours = "Xh ago", else date

Styling:
- Container: py-3 px-4 bg-background-secondary rounded-md
- Stats text: text-foreground-secondary text-sm
- Use • (bullet) as separator
- Numbers could be text-foreground for emphasis

Structure as a flex row with items separated by bullet spans.
```

---

### Prompt 4.2: ConfirmDismissModal Component

**Goal**: Create the confirmation modal for dismissing jobs.

**Context**: Uses the existing Modal component from the UI library. Shows job title and company name, warns this is permanent.

```text
Create a new component at packages/web/src/components/jobs/ConfirmDismissModal.tsx.

This modal confirms before permanently dismissing a job.

Props interface:
{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  jobTitle: string;
  companyName: string;
  loading?: boolean; // for when dismiss is in progress
}

Use the existing Modal component from '@/components/ui'.

Modal content:
- Title: "Dismiss Job?"
- Body text:
  - "Are you sure you want to dismiss"
  - "{jobTitle}" at "{companyName}"?
  - Empty line
  - "This job will be hidden from all views and cannot be undone."
- Footer: Cancel button (secondary variant) and Dismiss button (danger variant)

Behavior:
- Cancel calls onClose
- Dismiss calls onConfirm
- Dismiss button shows loading state when loading=true

Add data-testid attributes:
- Modal container: "confirm-modal"
- Dismiss button: "confirm-dismiss"

Use Modal size="sm".
```

---

### Prompt 4.3: JobCard Component (Full Detail)

**Goal**: Create the full-detail job card for the Top 10 section.

**Context**: This is a larger card showing all job details. Uses Card component from UI library.

```text
Create a new component at packages/web/src/components/jobs/JobCard.tsx.

This is the full-detail job card used in the Top 10 section.

Props interface:
{
  job: JobListing;
  onMarkApplied: (id: number) => void;
  onMarkNotInterested: (job: JobListing) => void; // passes full job for modal
  isNew?: boolean;
}

Layout using Card component:
1. Header row:
   - MatchScoreBadge with job.matchScore (if null, show "N/A" or skip)
   - Job title (text-lg font-semibold)
   - If isNew: small "New" badge (bg-accent/20 text-accent text-xs px-2 py-0.5 rounded)

2. Subtitle row:
   - Company name • Location (or "Remote" if remote && !location)
   - Use text-foreground-secondary

3. Description section:
   - job.description truncated to ~150 chars with "..."
   - text-sm text-foreground-secondary
   - Only show if description exists

4. Meta row:
   - Salary: job.salaryRange (if exists)
   - "Discovered: " + formatted firstSeenAt date
   - text-sm text-foreground-muted

5. Action row:
   - Apply link: <a> styled as button, opens job.url in new tab
   - "Application Submitted" button (secondary variant)
   - "Not Interested" button (ghost variant, text-error on hover)
   - If job.status === 'applied', show "Applied" badge instead of button

Behavior:
- Apply link: target="_blank" rel="noopener noreferrer"
- Application Submitted: calls onMarkApplied(job.id)
- Not Interested: calls onMarkNotInterested(job) - parent handles modal

Use Button component from UI library.
Add data-testid="job-card" to the Card.
Add data-testid="apply-link", "applied-button", "dismiss-button" to respective elements.
```

---

### Prompt 4.4: JobCardCompact Component

**Goal**: Create the compact job card for the company-grouped section.

**Context**: Smaller, single-row card with essential info only.

```text
Create a new component at packages/web/src/components/jobs/JobCardCompact.tsx.

This is a compact single-row job card used in the split view section.

Props interface:
{
  job: JobListing;
  onMarkApplied: (id: number) => void;
  onMarkNotInterested: (job: JobListing) => void;
  isNew?: boolean;
}

Layout - single row with flex justify-between:
Left side:
- MatchScoreBadge (size="sm")
- Job title (font-medium)
- Location or "Remote" (text-foreground-secondary text-sm)
- If isNew: small dot indicator (w-2 h-2 rounded-full bg-accent)

Right side - action buttons (flex gap-2):
- Apply: small link styled as ghost button, icon only or "Apply →"
- Applied: small secondary button (or show checkmark if already applied)
- Dismiss: small ghost button with X icon

Styling:
- Container: p-3 border-b border-background-tertiary hover:bg-background-secondary transition-colors
- Keep it compact - buttons should be size="sm"

Behavior:
- Same as JobCard but more compact
- If job.status === 'applied', show checkmark icon instead of Applied button

Add data-testid="job-card-compact"
```

---

### Prompt 4.5: CompanyCard Component

**Goal**: Create the company card for the left panel in the split view.

**Context**: Shows company info with crawl status and refresh button.

```text
Create a new component at packages/web/src/components/jobs/CompanyCard.tsx.

This displays a company in the left panel of the split view.

Props interface:
{
  company: Company;
  jobCount: number;
  lastCrawl: CrawlLog | null;
  isActive: boolean; // is this company currently highlighted/selected
  onClick: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

Determine crawl status from company.atsType and lastCrawl:
- If atsType is 'custom' or null: 'manual' (Manual check needed)
- If lastCrawl?.status === 'failed': 'error'
- If lastCrawl?.status === 'success': 'working'
- If no lastCrawl: 'never' (Never crawled)

Layout:
1. Header row:
   - Company name (font-medium)
   - Refresh button (icon only, small) - shows spinner when isRefreshing

2. Status row:
   - Colored dot + status text
   - working: green dot, "Auto-crawl working"
   - manual: yellow dot, "Manual check needed"
   - error: red dot, "Crawl error"
   - never: gray dot, "Never crawled"

3. Info rows:
   - Last crawl: formatted date or "Never"
   - Job count: "{jobCount} matching jobs"

4. Career page link:
   - Small text link to company.careerPageUrl
   - "Career Page →"
   - Opens in new tab

Styling:
- Container: p-3 rounded-md cursor-pointer transition-colors
- If isActive: bg-background-secondary border-l-2 border-accent
- If not active: hover:bg-background-secondary/50
- Status dots: w-2 h-2 rounded-full inline-block mr-2

Add data-testid="company-card"
```

---

### Prompt 4.6: JobFilters Component

**Goal**: Create the filter controls bar.

**Context**: Contains search box and filter toggles/dropdowns.

```text
Create a new component at packages/web/src/components/jobs/JobFilters.tsx.

This provides filter controls for the jobs page.

Props interface:
{
  filters: {
    search: string;
    crawlStatus: 'all' | 'working' | 'manual';
    showNewOnly: boolean;
    showApplied: boolean;
  };
  onChange: (filters: Props['filters']) => void;
}

Layout - horizontal flex with gap:
1. Search input:
   - Use Input component or a styled input
   - Placeholder: "Search jobs and companies..."
   - Full width on mobile, fixed width on desktop (w-64)
   - Updates filters.search on change (consider debouncing)

2. Crawl Status dropdown:
   - Use Select component or a simple <select>
   - Options: "All Companies", "Auto-crawl Only", "Manual Only"
   - Maps to 'all' | 'working' | 'manual'

3. Checkbox/Toggle: "New only"
   - Styled checkbox with label
   - Updates filters.showNewOnly

4. Checkbox/Toggle: "Show applied"
   - Styled checkbox with label
   - Updates filters.showApplied

Styling:
- Container: flex flex-wrap items-center gap-4
- Responsive: stack on mobile, row on desktop

Create a helper to update a single filter field:
const updateFilter = (key, value) => onChange({ ...filters, [key]: value });
```

---

## Phase 5: Section Components

### Prompt 5.1: TopJobsSection Component

**Goal**: Create the Top 10 jobs section.

**Context**: Displays the top 10 highest-scoring jobs in a vertical list of full-detail cards.

```text
Create a new component at packages/web/src/components/jobs/TopJobsSection.tsx.

This displays the "Top 10 Most Relevant Jobs" section.

Props interface:
{
  jobs: JobListing[]; // already filtered and sorted by parent
  loading: boolean;
  onMarkApplied: (id: number) => void;
  onMarkNotInterested: (job: JobListing) => void;
  newJobIds?: Set<number>; // IDs of jobs that are "new since last refresh"
}

Layout:
1. Section header:
   - "Top 10 Most Relevant Jobs" (text-lg font-semibold)
   - Maybe a subtle divider

2. Content:
   - If loading: show "Loading..." or skeleton
   - If no jobs: show "No jobs found"
   - Otherwise: vertical list of JobCard components with gap-4

Map over jobs and render JobCard for each:
- Pass isNew={newJobIds?.has(job.id)}
- Pass the callback functions

Styling:
- Container: space-y-4
- Header: mb-4

Add data-testid="top-jobs-section"
```

---

### Prompt 5.2: CompanyPanel Component

**Goal**: Create the left panel showing companies.

**Context**: Scrollable list of companies with click-to-jump and synchronized highlighting.

```text
Create a new component at packages/web/src/components/jobs/CompanyPanel.tsx.

This is the left panel in the split view showing all companies.

Props interface:
{
  companies: Company[];
  jobCounts: Map<number, number>; // companyId -> job count
  crawlLogs: Map<number, CrawlLog | null>; // companyId -> last crawl
  activeCompanyId: number | null; // currently highlighted company
  onCompanyClick: (companyId: number) => void;
  onRefresh: (companyId: number) => void;
  refreshingCompanyId: number | null;
  loading: boolean;
  panelRef?: React.RefObject<HTMLDivElement>;
}

Layout:
1. Panel header:
   - "Companies" (font-medium)
   - Total count in parentheses

2. Scrollable list:
   - Render CompanyCard for each company
   - Pass isActive={company.id === activeCompanyId}
   - Pass jobCount from jobCounts map
   - Pass lastCrawl from crawlLogs map
   - Pass isRefreshing={company.id === refreshingCompanyId}

Styling:
- Container: h-full flex flex-col
- Header: p-3 border-b border-background-tertiary
- List: flex-1 overflow-y-auto
- Give each company card an id for scroll sync: id={`company-${company.id}`}

If loading, show loading state.
If no companies, show "No companies tracked".

Add ref={panelRef} to the scrollable container for synchronized scrolling.
Add data-testid="company-panel"
```

---

### Prompt 5.3: JobsPanel Component

**Goal**: Create the right panel showing jobs grouped by company.

**Context**: Scrollable list of jobs grouped under company headers, with infinite scroll.

```text
Create a new component at packages/web/src/components/jobs/JobsPanel.tsx.

This is the right panel in the split view showing jobs grouped by company.

Props interface:
{
  jobsByCompany: Array<{
    company: Company;
    jobs: JobListing[];
  }>;
  onMarkApplied: (id: number) => void;
  onMarkNotInterested: (job: JobListing) => void;
  newJobIds?: Set<number>;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
  panelRef?: React.RefObject<HTMLDivElement>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

Layout:
For each company in jobsByCompany:
1. Company header:
   - id={`company-jobs-${company.id}`} for scroll-to-jump
   - Company name + job count: "ACME CORP (12 jobs)"
   - Sticky header styling

2. Jobs list:
   - Render JobCardCompact for each job
   - If company has no jobs: "No matching jobs"

3. At bottom:
   - If hasMore && !loadingMore: intersection observer or "Load More" button
   - If loadingMore: show loading spinner

Implement infinite scroll:
- Use IntersectionObserver on a sentinel div at the bottom
- When sentinel is visible and hasMore, call onLoadMore

Styling:
- Container: h-full overflow-y-auto
- Company header: sticky top-0 bg-background py-2 px-3 font-medium text-sm uppercase tracking-wide border-b border-background-tertiary
- Jobs: divide-y divide-background-tertiary

Add ref={panelRef} and onScroll handler for sync scrolling.
Add data-testid="jobs-panel"
```

---

### Prompt 5.4: CompanyJobsSection Component (Split View)

**Goal**: Create the split view container with synchronized scrolling.

**Context**: This orchestrates the two panels and handles scroll synchronization.

```text
Create a new component at packages/web/src/components/jobs/CompanyJobsSection.tsx.

This is the split view container with companies on left, jobs on right.

Props interface:
{
  companies: Company[];
  jobsByCompany: Array<{ company: Company; jobs: JobListing[] }>;
  crawlLogs: CrawlLog[];
  loading: boolean;
  onCompanyClick: (companyId: number) => void;
  onCompanyRefresh: (companyId: number) => void;
  refreshingCompanyId: number | null;
  onMarkApplied: (id: number) => void;
  onMarkNotInterested: (job: JobListing) => void;
  newJobIds?: Set<number>;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
}

Internal state:
- activeCompanyId: number | null - which company is highlighted
- Refs for both panels

Pre-process data:
- Create jobCounts Map from jobsByCompany
- Create crawlLogsMap from crawlLogs (keyed by companyId)

Synchronized scrolling logic:
1. When right panel scrolls:
   - Determine which company header is at/near the top
   - Set activeCompanyId to that company
   - Optionally scroll left panel to show that company

2. When company is clicked in left panel:
   - Set activeCompanyId
   - Scroll right panel to that company's section using scrollIntoView

Use IntersectionObserver on company headers in the right panel to detect which is currently visible.

Layout:
- Container: flex h-[600px] border border-background-tertiary rounded-lg overflow-hidden
- Left panel (CompanyPanel): w-80 border-r border-background-tertiary flex-shrink-0
- Right panel (JobsPanel): flex-1

Responsive:
- On mobile (< md), stack vertically or hide left panel

Section header above the split view:
- "Companies & Jobs"
- Uses same styling as TopJobsSection header

Add data-testid="company-jobs-section"
```

---

## Phase 6: Pages

### Prompt 6.1: Job Preferences Page

**Goal**: Create the simpler preferences page first.

**Context**: This page allows editing the job profile. It's simpler than the main Jobs page.

```text
Create a new page at packages/web/src/app/(pa)/pa/jobs/preferences/page.tsx.

This is the Job Preferences page for editing search criteria.

Use 'use client' directive at the top.

Import and use:
- Layout component from '@/components/layout'
- useJobProfile hook
- TagInput component
- Button component

Page structure:
1. Layout wrapper
2. Container div with max-w-2xl and padding

3. Header:
   - "Job Preferences" (text-2xl font-semibold)

4. Error display (if error from hook)

5. Loading state

6. Form (when loaded):
   - Keywords TagInput
   - Job Titles TagInput
   - Locations TagInput
   - Remote Only toggle/checkbox
   - Save button

State management:
- Local state for form data: { keywords, titles, locations, remoteOnly }
- useEffect to sync local state with profile when loaded
- handleSave function that calls updateProfile

Form layout:
- Stack inputs vertically with space-y-6
- Each TagInput has a label prop
- Remote Only: styled checkbox with label
- Save button at bottom, shows loading when saving, disabled if no changes

Show saveError if present, clear it on next save attempt.

Add navigation back to main Jobs page or rely on sidebar.
```

---

### Prompt 6.2: Main Jobs Page

**Goal**: Create the main Jobs page assembling all components.

**Context**: This is the primary jobs discovery page with all sections.

```text
Create a new page at packages/web/src/app/(pa)/pa/jobs/page.tsx.

This is the main Jobs page.

Use 'use client' directive at the top.

Import and use:
- Layout from '@/components/layout'
- All four hooks: useJobs, useCompanies, useJobStats, and fetch crawl logs from API
- StatsBar, JobFilters, TopJobsSection, CompanyJobsSection, ConfirmDismissModal
- CrawlProgressIndicator
- Button component

Page state:
- pageFilters: { search, crawlStatus, showNewOnly, showApplied }
- dismissModal: { isOpen: boolean, job: JobListing | null }
- Fetch crawl logs on mount for CompanyJobsSection

Computed values:
- topJobs: filter jobs (exclude applied/dismissed), sort by matchScore desc, take first 10
- filteredJobs: apply pageFilters.search to jobs
- filteredCompanies: apply pageFilters.crawlStatus filter
- jobsByCompany: group filtered jobs by company
- newJobIds: Set of job IDs where status === 'new'

Handlers:
- handleRefreshAll: call crawlAll(), then refresh all data
- handleDismissClick: open modal with job
- handleConfirmDismiss: call markDismissed, close modal
- handleCompanyClick: will be passed to CompanyJobsSection

Page layout:
1. Layout wrapper
2. Container with p-6 space-y-6

3. Header row (flex justify-between):
   - "Jobs" title
   - "Refresh All Jobs" button (loading when crawlingAll)

4. CrawlProgressIndicator (shown when crawlingAll)

5. StatsBar

6. JobFilters

7. Error display with retry button (if error)

8. TopJobsSection

9. CompanyJobsSection

10. ConfirmDismissModal

Pass appropriate props to each component based on the hooks and handlers.

Consider a loading skeleton for initial page load.
```

---

## Phase 7: Navigation Integration

### Prompt 7.1: Add Jobs to Sidebar Navigation

**Goal**: Add the Jobs link to the sidebar navigation.

**Context**: The sidebar is in `packages/web/src/components/layout/Sidebar.tsx`. Add Jobs between Actions and Blog.

```text
Update packages/web/src/components/layout/Sidebar.tsx to add a Jobs navigation item.

Find the navItems array and add a new entry for Jobs:
- name: 'Jobs'
- href: '/pa/jobs'
- icon: BriefcaseIcon (or appropriate icon from the icon library being used)

Place it between Actions and Blog in the navigation order.

If using Heroicons, import BriefcaseIcon:
import { BriefcaseIcon } from '@heroicons/react/24/outline';

If using a different icon library, find an appropriate briefcase or job-related icon.

The entry should follow the same pattern as existing items:
{ name: 'Jobs', href: '/pa/jobs', icon: BriefcaseIcon }

That's the only change needed - the existing sidebar component will render it automatically.
```

---

## Phase 8: Polish & Testing

### Prompt 8.1: Add Loading Skeletons

**Goal**: Add proper loading states with skeleton UI.

```text
Add loading skeleton components for the Jobs page.

Create packages/web/src/components/jobs/JobCardSkeleton.tsx:
- Mimics JobCard layout with animated pulse backgrounds
- Use animate-pulse on bg-background-tertiary divs
- Match the structure: score badge placeholder, title bar, subtitle bar, description lines, button row

Create packages/web/src/components/jobs/CompanyCardSkeleton.tsx:
- Mimics CompanyCard layout with pulse animation
- Simpler than JobCard

Update TopJobsSection:
- When loading, show 3 JobCardSkeleton components

Update CompanyPanel:
- When loading, show 5 CompanyCardSkeleton components

Update JobsPanel:
- When loading, show skeleton grouped sections

This provides visual feedback during initial load.
```

---

### Prompt 8.2: Final Integration Testing Checklist

**Goal**: Verify all functionality works end-to-end.

```text
Perform a manual integration test of the Jobs feature. Verify each item:

1. Navigation:
   - [ ] Jobs link appears in sidebar between Actions and Blog
   - [ ] Clicking Jobs navigates to /pa/jobs
   - [ ] Page loads without errors

2. Stats Bar:
   - [ ] Shows loading state initially
   - [ ] Displays correct stats after load
   - [ ] Last refresh time formats correctly

3. Top 10 Section:
   - [ ] Shows up to 10 jobs sorted by match score
   - [ ] Job cards display all required fields
   - [ ] Match score badges show correct colors
   - [ ] Apply link opens in new tab
   - [ ] "Application Submitted" updates job locally
   - [ ] "Not Interested" shows confirmation modal
   - [ ] Confirmed dismiss removes job from all views

4. Company Jobs Section:
   - [ ] Companies list on left, jobs grouped on right
   - [ ] Clicking company scrolls to its jobs
   - [ ] Scrolling jobs highlights current company
   - [ ] Per-company refresh button works
   - [ ] Infinite scroll loads more jobs

5. Filters:
   - [ ] Search filters jobs and companies
   - [ ] Crawl status filter works
   - [ ] "New only" toggle works
   - [ ] "Show applied" toggle works

6. Refresh All:
   - [ ] Button shows loading state
   - [ ] Progress indicator appears
   - [ ] Data refreshes after crawl

7. Job Preferences Page:
   - [ ] Navigate to /pa/jobs/preferences
   - [ ] Existing profile loads into form
   - [ ] Tag inputs work (add/remove)
   - [ ] Remote only toggle works
   - [ ] Save updates profile
   - [ ] Navigation back to Jobs page works

8. Mobile:
   - [ ] Action buttons visible (not hover-only)
   - [ ] Layout responsive on small screens
   - [ ] Touch targets adequate size

Fix any issues found during testing.
```

---

## Summary

| Phase | Prompts | Description |
|-------|---------|-------------|
| 1. API Foundation | 1.1 - 1.2 | Types and API functions |
| 2. Data Hooks | 2.1 - 2.4 | Four custom hooks |
| 3. Atomic UI | 3.1 - 3.3 | MatchScoreBadge, TagInput, CrawlProgress |
| 4. Entity Components | 4.1 - 4.6 | StatsBar, Modal, Cards, Filters |
| 5. Section Components | 5.1 - 5.4 | TopJobs, Panels, Split View |
| 6. Pages | 6.1 - 6.2 | Preferences page, Main Jobs page |
| 7. Navigation | 7.1 | Sidebar integration |
| 8. Polish | 8.1 - 8.2 | Skeletons, Testing |

**Total: 18 prompts**

Each prompt builds on previous work and produces integrated, working code. Execute in order.
