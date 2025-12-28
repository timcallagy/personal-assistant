# Job Search UI - Implementation Checklist

> **Spec**: `/docs/specs/job-search-ui-spec.md`
> **Prompt Plan**: `/docs/specs/job-search-ui-prompt-plan.md`
> **Started**: 2025-12-28

---

## Phase 1: API Foundation

- [ ] **1.1 Job Tracker Types**
  - [ ] Add JobStatus type
  - [ ] Add AtsType type
  - [ ] Add Company interface
  - [ ] Add JobListing interface
  - [ ] Add JobProfile interface
  - [ ] Add CrawlLog interface
  - [ ] Add JobStats interface
  - [ ] Add filter interfaces (JobListingsFilter, CompaniesFilter)
  - [ ] Add response interfaces (CompaniesResponse, JobListingsResponse, etc.)

- [ ] **1.2 Job Tracker API Functions**
  - [ ] Add jobs.listCompanies()
  - [ ] Add jobs.getCompany()
  - [ ] Add jobs.listJobs()
  - [ ] Add jobs.getJob()
  - [ ] Add jobs.updateJobStatus()
  - [ ] Add jobs.batchUpdateStatus()
  - [ ] Add jobs.getStats()
  - [ ] Add jobs.getProfile()
  - [ ] Add jobs.updateProfile()
  - [ ] Add jobs.crawlAll()
  - [ ] Add jobs.crawlCompany()
  - [ ] Add jobs.getCrawlLogs()

---

## Phase 2: Data Hooks

- [ ] **2.1 useJobStats Hook**
  - [ ] Create hooks/useJobStats.ts
  - [ ] Implement stats state management
  - [ ] Implement fetch on mount
  - [ ] Implement refresh function
  - [ ] Handle loading and error states

- [ ] **2.2 useJobProfile Hook**
  - [ ] Create hooks/useJobProfile.ts
  - [ ] Implement profile state management
  - [ ] Implement fetch on mount
  - [ ] Implement updateProfile function
  - [ ] Handle loading, saving, and error states

- [ ] **2.3 useCompanies Hook**
  - [ ] Create hooks/useCompanies.ts
  - [ ] Implement companies state management
  - [ ] Implement fetch on mount
  - [ ] Implement crawlCompany function
  - [ ] Implement crawlAll function
  - [ ] Track crawling state (crawlingCompanyId, crawlingAll)

- [ ] **2.4 useJobs Hook**
  - [ ] Create hooks/useJobs.ts
  - [ ] Implement jobs state with pagination
  - [ ] Implement filters state
  - [ ] Implement fetchJobs with loadMore support
  - [ ] Implement markApplied function
  - [ ] Implement markDismissed function
  - [ ] Handle infinite scroll (hasMore, loadMore)

---

## Phase 3: Atomic UI Components

- [ ] **3.1 MatchScoreBadge Component**
  - [ ] Create components/jobs/ directory
  - [ ] Create MatchScoreBadge.tsx
  - [ ] Implement color logic (green/yellow/red thresholds)
  - [ ] Implement size variants (sm/md)
  - [ ] Export getMatchScoreLevel helper

- [ ] **3.2 TagInput Component**
  - [ ] Create TagInput.tsx
  - [ ] Implement tag display with remove buttons
  - [ ] Implement text input with Enter to add
  - [ ] Handle duplicate prevention
  - [ ] Style with design system tokens

- [ ] **3.3 CrawlProgressIndicator Component**
  - [ ] Create CrawlProgressIndicator.tsx
  - [ ] Implement spinner display
  - [ ] Implement message display
  - [ ] Conditional rendering when not running

---

## Phase 4: Entity Components

- [ ] **4.1 StatsBar Component**
  - [ ] Create StatsBar.tsx
  - [ ] Implement stats display format
  - [ ] Implement formatRelativeTime helper
  - [ ] Handle loading state

- [ ] **4.2 ConfirmDismissModal Component**
  - [ ] Create ConfirmDismissModal.tsx
  - [ ] Use existing Modal component
  - [ ] Display job title and company name
  - [ ] Implement Cancel and Dismiss buttons
  - [ ] Handle loading state on confirm

- [ ] **4.3 JobCard Component (Full Detail)**
  - [ ] Create JobCard.tsx
  - [ ] Implement header with score badge and title
  - [ ] Implement company/location subtitle
  - [ ] Implement description snippet
  - [ ] Implement meta row (salary, discovered date)
  - [ ] Implement action buttons (Apply, Applied, Not Interested)
  - [ ] Handle applied status display

- [ ] **4.4 JobCardCompact Component**
  - [ ] Create JobCardCompact.tsx
  - [ ] Implement single-row layout
  - [ ] Implement compact action buttons
  - [ ] Handle applied status display

- [ ] **4.5 CompanyCard Component**
  - [ ] Create CompanyCard.tsx
  - [ ] Implement crawl status logic
  - [ ] Implement status indicator (colored dot)
  - [ ] Implement refresh button
  - [ ] Implement career page link
  - [ ] Handle active/selected state

- [ ] **4.6 JobFilters Component**
  - [ ] Create JobFilters.tsx
  - [ ] Implement search input
  - [ ] Implement crawl status dropdown
  - [ ] Implement "New only" checkbox
  - [ ] Implement "Show applied" checkbox

---

## Phase 5: Section Components

- [ ] **5.1 TopJobsSection Component**
  - [ ] Create TopJobsSection.tsx
  - [ ] Implement section header
  - [ ] Render JobCard list
  - [ ] Handle loading state
  - [ ] Handle empty state

- [ ] **5.2 CompanyPanel Component**
  - [ ] Create CompanyPanel.tsx
  - [ ] Implement panel header with count
  - [ ] Render CompanyCard list
  - [ ] Handle loading state
  - [ ] Add scroll ref for sync

- [ ] **5.3 JobsPanel Component**
  - [ ] Create JobsPanel.tsx
  - [ ] Implement jobs grouped by company
  - [ ] Implement sticky company headers
  - [ ] Implement infinite scroll with IntersectionObserver
  - [ ] Add scroll ref and onScroll handler

- [ ] **5.4 CompanyJobsSection Component**
  - [ ] Create CompanyJobsSection.tsx
  - [ ] Implement split view layout
  - [ ] Implement synchronized scrolling
  - [ ] Implement click-to-jump navigation
  - [ ] Wire up CompanyPanel and JobsPanel

---

## Phase 6: Pages

- [ ] **6.1 Job Preferences Page**
  - [ ] Create app/(pa)/pa/jobs/preferences/page.tsx
  - [ ] Implement form state management
  - [ ] Wire up useJobProfile hook
  - [ ] Implement TagInput fields
  - [ ] Implement Remote Only toggle
  - [ ] Implement Save button

- [ ] **6.2 Main Jobs Page**
  - [ ] Create app/(pa)/pa/jobs/page.tsx
  - [ ] Wire up all hooks
  - [ ] Implement page filters state
  - [ ] Implement dismiss modal state
  - [ ] Compute topJobs, filteredJobs, jobsByCompany
  - [ ] Wire up all section components
  - [ ] Implement refresh all handler

---

## Phase 7: Navigation Integration

- [ ] **7.1 Add Jobs to Sidebar**
  - [ ] Import BriefcaseIcon (or appropriate icon)
  - [ ] Add Jobs nav item between Actions and Blog
  - [ ] Verify navigation works

---

## Phase 8: Polish & Testing

- [ ] **8.1 Add Loading Skeletons**
  - [ ] Create JobCardSkeleton.tsx
  - [ ] Create CompanyCardSkeleton.tsx
  - [ ] Update TopJobsSection to use skeletons
  - [ ] Update CompanyPanel to use skeletons

- [ ] **8.2 Integration Testing**
  - [ ] Test navigation
  - [ ] Test stats bar
  - [ ] Test top 10 section
  - [ ] Test company jobs section
  - [ ] Test filters
  - [ ] Test refresh all
  - [ ] Test job preferences page
  - [ ] Test mobile responsiveness

---

## Summary

| Phase | Status | Progress |
|-------|--------|----------|
| 1. API Foundation | Not Started | 0/2 |
| 2. Data Hooks | Not Started | 0/4 |
| 3. Atomic UI | Not Started | 0/3 |
| 4. Entity Components | Not Started | 0/6 |
| 5. Section Components | Not Started | 0/4 |
| 6. Pages | Not Started | 0/2 |
| 7. Navigation | Not Started | 0/1 |
| 8. Polish | Not Started | 0/2 |

**Total Progress: 0/24 prompts completed**
