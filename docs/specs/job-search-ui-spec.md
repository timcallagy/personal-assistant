# Job Search UI - Developer Specification

> **Version**: 1.0
> **Date**: 2025-12-28
> **Status**: Ready for Implementation

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [API Integration](#3-api-integration)
4. [Data Types](#4-data-types)
5. [Component Specifications](#5-component-specifications)
6. [State Management](#6-state-management)
7. [Page Implementation](#7-page-implementation)
8. [Error Handling](#8-error-handling)
9. [Testing Plan](#9-testing-plan)
10. [Implementation Checklist](#10-implementation-checklist)

---

## 1. Overview

### 1.1 Purpose

Add a Jobs page to the Personal Assistant Web UI for discovering new job opportunities and managing tracked companies.

### 1.2 Goals

| Priority | Goal |
|----------|------|
| Primary | Discover new job opportunities (browse, filter, find relevant jobs) |
| Secondary | Visibility into tracked companies, especially those requiring manual checking |

### 1.3 Access & Navigation

| Attribute | Value |
|-----------|-------|
| Main URL | `/pa/jobs` |
| Preferences URL | `/pa/jobs/preferences` |
| Navigation | "Jobs" item in main sidebar navigation |
| Authentication | Required (protected route) |

---

## 2. Architecture

### 2.1 Directory Structure

```
packages/web/src/
├── app/(pa)/pa/jobs/
│   ├── page.tsx                    # Main Jobs page
│   └── preferences/
│       └── page.tsx                # Job Preferences page
├── components/jobs/
│   ├── JobCard.tsx                 # Full detail job card (Top 10)
│   ├── JobCardCompact.tsx          # Compact job card (split view)
│   ├── CompanyCard.tsx             # Company card for left panel
│   ├── TopJobsSection.tsx          # Top 10 jobs section
│   ├── CompanyJobsSection.tsx      # Split view section
│   ├── CompanyPanel.tsx            # Left panel with companies
│   ├── JobsPanel.tsx               # Right panel with grouped jobs
│   ├── StatsBar.tsx                # Summary statistics bar
│   ├── JobFilters.tsx              # Filter controls
│   ├── JobPreferencesForm.tsx      # Profile editing form
│   ├── TagInput.tsx                # Tag-style input component
│   ├── MatchScoreBadge.tsx         # Color-coded score display
│   ├── CrawlProgressIndicator.tsx  # Progress during crawl
│   └── ConfirmDismissModal.tsx     # Confirmation for "Not interested"
├── hooks/
│   ├── useJobs.ts                  # Job listings hook
│   ├── useCompanies.ts             # Companies hook
│   ├── useJobProfile.ts            # Job profile hook
│   └── useJobStats.ts              # Statistics hook
└── lib/
    └── api.ts                      # Add jobs API module
```

### 2.2 Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | Next.js 14.2 | App Router with `'use client'` |
| Styling | Tailwind CSS | Follow existing design tokens |
| State | React Hooks | Custom hooks pattern |
| HTTP | Fetch API | Via existing `api.ts` patterns |
| Types | TypeScript | Shared types from `@pa/shared` |

### 2.3 Design System Tokens

Use existing PA dark theme:

```typescript
// Colors (from tailwind.config.ts)
background: '#0f172a'      // slate-900
foreground: '#f8fafc'      // slate-50
accent: '#06b6d4'          // cyan-500
success: '#22c55e'         // green-500
warning: '#f59e0b'         // amber-500
error: '#ef4444'           // red-500

// Match Score Colors
matchHigh: '#22c55e'       // green (70%+)
matchMedium: '#f59e0b'     // yellow (40-69%)
matchLow: '#ef4444'        // red (<40%)
```

---

## 3. API Integration

### 3.1 API Endpoints

All endpoints are prefixed with `/api/v1/jobs` and require authentication.

#### Companies

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/companies` | List all tracked companies |
| GET | `/companies/:id` | Get single company |

#### Job Listings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/listings` | List job listings with filters |
| GET | `/listings/stats` | Get job statistics |
| GET | `/listings/:id` | Get single listing |
| PUT | `/listings/:id/status` | Update job status |
| PUT | `/listings/batch-status` | Batch update statuses |

#### Job Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get job search profile |
| PUT | `/profile` | Update job profile |

#### Crawling

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/crawl/all` | Crawl all active companies |
| POST | `/crawl/:companyId` | Crawl specific company |
| GET | `/crawl/logs` | Get crawl history |

### 3.2 API Module Implementation

Add to `packages/web/src/lib/api.ts`:

```typescript
// ============================================
// Job Tracker Types (import from @pa/shared or define locally)
// ============================================

export type JobStatus = 'new' | 'viewed' | 'applied' | 'dismissed';
export type AtsType = 'greenhouse' | 'lever' | 'ashby' | 'smartrecruiters' | 'workday' | 'custom';

export interface Company {
  id: number;
  name: string;
  careerPageUrl: string;
  atsType: AtsType | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobListing {
  id: number;
  companyId: number;
  companyName?: string;
  externalId: string;
  title: string;
  url: string;
  location: string | null;
  remote: boolean;
  department: string | null;
  description: string | null;
  postedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  status: JobStatus;
  matchScore: number | null;
}

export interface JobProfile {
  id: number;
  keywords: string[];
  titles: string[];
  locations: string[];
  remoteOnly: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CrawlLog {
  id: number;
  companyId: number;
  companyName?: string;
  startedAt: string;
  completedAt: string | null;
  status: 'running' | 'success' | 'failed';
  jobsFound: number;
  newJobs: number;
  error: string | null;
}

export interface JobStats {
  totalJobs: number;
  totalCompanies: number;
  newSinceLastRefresh: number;
  applicationsSubmitted: number;
  lastRefreshAt: string | null;
}

// ============================================
// Filter Types
// ============================================

export interface JobListingsFilter {
  companyId?: number;
  status?: JobStatus;
  minScore?: number;
  limit?: number;
  offset?: number;
  locationInclude?: string[];
  locationExclude?: string[];
}

export interface CompaniesFilter {
  activeOnly?: boolean;
}

// ============================================
// Response Types
// ============================================

export interface CompaniesResponse {
  companies: Company[];
  total: number;
}

export interface JobListingsResponse {
  listings: JobListing[];
  total: number;
  limit: number;
  offset: number;
}

export interface JobProfileResponse {
  profile: JobProfile | null;
}

export interface CrawlResponse {
  crawlId: number;
  companiesCrawled: number;
  totalJobsFound: number;
  newJobsFound: number;
}

export interface CrawlLogsResponse {
  logs: CrawlLog[];
  total: number;
}

// ============================================
// API Module
// ============================================

export const jobs = {
  // Companies
  listCompanies: async (filters?: CompaniesFilter): Promise<CompaniesResponse> => {
    const params = new URLSearchParams();
    if (filters?.activeOnly !== undefined) {
      params.set('activeOnly', String(filters.activeOnly));
    }
    const query = params.toString();
    return request<CompaniesResponse>(`/jobs/companies${query ? `?${query}` : ''}`);
  },

  getCompany: async (id: number): Promise<Company> => {
    return request<Company>(`/jobs/companies/${id}`);
  },

  // Listings
  listJobs: async (filters?: JobListingsFilter): Promise<JobListingsResponse> => {
    const params = new URLSearchParams();
    if (filters?.companyId) params.set('companyId', String(filters.companyId));
    if (filters?.status) params.set('status', filters.status);
    if (filters?.minScore) params.set('minScore', String(filters.minScore));
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    if (filters?.locationInclude?.length) {
      params.set('locationInclude', filters.locationInclude.join(','));
    }
    if (filters?.locationExclude?.length) {
      params.set('locationExclude', filters.locationExclude.join(','));
    }
    const query = params.toString();
    return request<JobListingsResponse>(`/jobs/listings${query ? `?${query}` : ''}`);
  },

  getJob: async (id: number): Promise<JobListing> => {
    return request<JobListing>(`/jobs/listings/${id}`);
  },

  updateJobStatus: async (id: number, status: JobStatus): Promise<JobListing> => {
    return request<JobListing>(`/jobs/listings/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  },

  batchUpdateStatus: async (ids: number[], status: JobStatus): Promise<{ updated: number }> => {
    return request<{ updated: number }>(`/jobs/listings/batch-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, status }),
    });
  },

  getStats: async (): Promise<JobStats> => {
    return request<JobStats>(`/jobs/listings/stats`);
  },

  // Profile
  getProfile: async (): Promise<JobProfileResponse> => {
    return request<JobProfileResponse>(`/jobs/profile`);
  },

  updateProfile: async (data: Partial<Omit<JobProfile, 'id' | 'createdAt' | 'updatedAt'>>): Promise<JobProfile> => {
    return request<JobProfile>(`/jobs/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Crawling
  crawlAll: async (): Promise<CrawlResponse> => {
    return request<CrawlResponse>(`/jobs/crawl/all`, { method: 'POST' });
  },

  crawlCompany: async (companyId: number): Promise<CrawlResponse> => {
    return request<CrawlResponse>(`/jobs/crawl/${companyId}`, { method: 'POST' });
  },

  getCrawlLogs: async (limit?: number): Promise<CrawlLogsResponse> => {
    const params = limit ? `?limit=${limit}` : '';
    return request<CrawlLogsResponse>(`/jobs/crawl/logs${params}`);
  },
};
```

---

## 4. Data Types

### 4.1 Shared Types

Import from `@pa/shared` or define in `api.ts`:

```typescript
// Already defined in packages/shared/src/index.ts
// - Company, JobListing, JobProfile, CrawlLog
// - JobStatus, AtsType
// - JobListingsFilter, etc.
```

### 4.2 UI-Specific Types

```typescript
// packages/web/src/components/jobs/types.ts

export interface CompanyWithCrawlStatus extends Company {
  lastCrawl: CrawlLog | null;
  jobCount: number;
  crawlStatus: 'working' | 'manual' | 'error' | 'never';
}

export interface JobsPageFilters {
  search: string;
  crawlStatus: 'all' | 'working' | 'manual';
  showNewOnly: boolean;
  showApplied: boolean;
}

export interface MatchScoreLevel {
  level: 'high' | 'medium' | 'low';
  color: string;
  label: string;
}

export function getMatchScoreLevel(score: number): MatchScoreLevel {
  if (score >= 70) return { level: 'high', color: 'text-success', label: 'High Match' };
  if (score >= 40) return { level: 'medium', color: 'text-warning', label: 'Medium Match' };
  return { level: 'low', color: 'text-error', label: 'Low Match' };
}
```

---

## 5. Component Specifications

### 5.1 JobCard (Full Detail)

**File**: `packages/web/src/components/jobs/JobCard.tsx`

**Purpose**: Display job in Top 10 section with full details

**Props**:
```typescript
interface JobCardProps {
  job: JobListing;
  onMarkApplied: (id: number) => void;
  onMarkNotInterested: (id: number) => void;
  isNew?: boolean;
}
```

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ [Match Score Badge]  Job Title                              │
│ Company Name • Location                                     │
├─────────────────────────────────────────────────────────────┤
│ Description snippet (2-3 lines max)...                      │
├─────────────────────────────────────────────────────────────┤
│ Salary: $X - $Y (if available)     Discovered: Dec 28, 2025 │
├─────────────────────────────────────────────────────────────┤
│ [Apply →]        [Application Submitted] [Not Interested]   │
└─────────────────────────────────────────────────────────────┘
```

**Behavior**:
- Apply link opens in new tab (`target="_blank" rel="noopener noreferrer"`)
- "Not Interested" shows confirmation modal before action
- "Application Submitted" applies immediately
- Uses `Card` component with full padding

---

### 5.2 JobCardCompact

**File**: `packages/web/src/components/jobs/JobCardCompact.tsx`

**Purpose**: Display job in company-grouped section

**Props**:
```typescript
interface JobCardCompactProps {
  job: JobListing;
  onMarkApplied: (id: number) => void;
  onMarkNotInterested: (id: number) => void;
  isNew?: boolean;
}
```

**Layout**:
```
┌───────────────────────────────────────────────────────────┐
│ [85%] Job Title • Location    [Apply] [Applied] [Dismiss] │
└───────────────────────────────────────────────────────────┘
```

---

### 5.3 CompanyCard

**File**: `packages/web/src/components/jobs/CompanyCard.tsx`

**Purpose**: Display company in left panel

**Props**:
```typescript
interface CompanyCardProps {
  company: CompanyWithCrawlStatus;
  isActive: boolean;
  onClick: () => void;
  onRefresh: (companyId: number) => void;
  isRefreshing: boolean;
}
```

**Layout**:
```
┌──────────────────────────────────────┐
│ [Logo] Company Name          [↻]     │
│        ● Auto-crawl working          │
│        Last crawl: 2 hours ago       │
│        12 matching jobs              │
│        [Career Page →]               │
└──────────────────────────────────────┘
```

**Status Indicators**:
- `working`: Green dot, "Auto-crawl working"
- `manual`: Yellow dot, "Manual check needed"
- `error`: Red dot, "Crawl error"
- `never`: Gray dot, "Never crawled"

---

### 5.4 MatchScoreBadge

**File**: `packages/web/src/components/jobs/MatchScoreBadge.tsx`

**Props**:
```typescript
interface MatchScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md';
}
```

**Implementation**:
```typescript
export function MatchScoreBadge({ score, size = 'md' }: MatchScoreBadgeProps) {
  const { color, label } = getMatchScoreLevel(score);

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${color} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
      title={label}
    >
      {score}%
    </span>
  );
}
```

---

### 5.5 TagInput

**File**: `packages/web/src/components/jobs/TagInput.tsx`

**Purpose**: Tag-style input for job preferences

**Props**:
```typescript
interface TagInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  error?: string;
}
```

**Behavior**:
- Type and press Enter to add tag
- Click X on tag to remove
- Shows tags as removable chips/badges

---

### 5.6 StatsBar

**File**: `packages/web/src/components/jobs/StatsBar.tsx`

**Props**:
```typescript
interface StatsBarProps {
  stats: JobStats;
  loading: boolean;
}
```

**Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│ 156 Jobs • 24 Companies • 12 New • 3 Applied • Last: 2h ago    │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5.7 ConfirmDismissModal

**File**: `packages/web/src/components/jobs/ConfirmDismissModal.tsx`

**Props**:
```typescript
interface ConfirmDismissModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  jobTitle: string;
  companyName: string;
}
```

**Content**:
```
┌────────────────────────────────────────┐
│ Dismiss Job?                           │
├────────────────────────────────────────┤
│ Are you sure you want to dismiss       │
│ "Senior PM" at "Acme Corp"?            │
│                                        │
│ This job will be hidden from all       │
│ views and cannot be undone.            │
├────────────────────────────────────────┤
│              [Cancel]  [Dismiss]       │
└────────────────────────────────────────┘
```

---

### 5.8 CrawlProgressIndicator

**File**: `packages/web/src/components/jobs/CrawlProgressIndicator.tsx`

**Props**:
```typescript
interface CrawlProgressIndicatorProps {
  isRunning: boolean;
  companiesTotal?: number;
  companiesCompleted?: number;
  currentCompany?: string;
}
```

**Display**: Shows spinner with optional progress text during crawl operations.

---

## 6. State Management

### 6.1 useJobs Hook

**File**: `packages/web/src/hooks/useJobs.ts`

```typescript
interface UseJobsOptions {
  initialFilters?: JobListingsFilter;
  autoFetch?: boolean;
}

interface UseJobsReturn {
  // Data
  jobs: JobListing[];
  total: number;

  // State
  loading: boolean;
  error: string | null;

  // Filters
  filters: JobListingsFilter;
  setFilters: (filters: JobListingsFilter) => void;

  // Actions
  refresh: () => Promise<void>;
  markApplied: (id: number) => Promise<void>;
  markDismissed: (id: number) => Promise<void>;

  // Infinite scroll
  hasMore: boolean;
  loadMore: () => Promise<void>;
  loadingMore: boolean;
}

export function useJobs(options: UseJobsOptions = {}): UseJobsReturn {
  const { initialFilters = {}, autoFetch = true } = options;

  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<JobListingsFilter>(initialFilters);
  const [offset, setOffset] = useState(0);

  const LIMIT = 20;

  const fetchJobs = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setOffset(0);
    }
    setError(null);

    try {
      const response = await jobsApi.listJobs({
        ...filters,
        limit: LIMIT,
        offset: isLoadMore ? offset : 0,
      });

      if (isLoadMore) {
        setJobs(prev => [...prev, ...response.listings]);
      } else {
        setJobs(response.listings);
      }
      setTotal(response.total);
      setOffset(isLoadMore ? offset + LIMIT : LIMIT);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to fetch jobs');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, offset]);

  useEffect(() => {
    if (autoFetch) {
      fetchJobs();
    }
  }, [filters]); // Re-fetch on filter change

  const markApplied = async (id: number) => {
    await jobsApi.updateJobStatus(id, 'applied');
    setJobs(prev => prev.map(job =>
      job.id === id ? { ...job, status: 'applied' } : job
    ));
  };

  const markDismissed = async (id: number) => {
    await jobsApi.updateJobStatus(id, 'dismissed');
    setJobs(prev => prev.filter(job => job.id !== id));
    setTotal(prev => prev - 1);
  };

  return {
    jobs,
    total,
    loading,
    error,
    filters,
    setFilters,
    refresh: () => fetchJobs(false),
    markApplied,
    markDismissed,
    hasMore: jobs.length < total,
    loadMore: () => fetchJobs(true),
    loadingMore,
  };
}
```

---

### 6.2 useCompanies Hook

**File**: `packages/web/src/hooks/useCompanies.ts`

```typescript
interface UseCompaniesReturn {
  companies: CompanyWithCrawlStatus[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  crawlCompany: (id: number) => Promise<void>;
  crawlAll: () => Promise<void>;
  crawlingCompanyId: number | null;
  crawlingAll: boolean;
}

export function useCompanies(): UseCompaniesReturn {
  // Similar pattern to useJobs
  // Includes crawl state management
}
```

---

### 6.3 useJobProfile Hook

**File**: `packages/web/src/hooks/useJobProfile.ts`

```typescript
interface UseJobProfileReturn {
  profile: JobProfile | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  saveError: string | null;
  refresh: () => Promise<void>;
  updateProfile: (data: Partial<JobProfile>) => Promise<void>;
}
```

---

### 6.4 useJobStats Hook

**File**: `packages/web/src/hooks/useJobStats.ts`

```typescript
interface UseJobStatsReturn {
  stats: JobStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
```

---

## 7. Page Implementation

### 7.1 Main Jobs Page

**File**: `packages/web/src/app/(pa)/pa/jobs/page.tsx`

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { useJobs } from '@/hooks/useJobs';
import { useCompanies } from '@/hooks/useCompanies';
import { useJobStats } from '@/hooks/useJobStats';
import { StatsBar } from '@/components/jobs/StatsBar';
import { JobFilters } from '@/components/jobs/JobFilters';
import { TopJobsSection } from '@/components/jobs/TopJobsSection';
import { CompanyJobsSection } from '@/components/jobs/CompanyJobsSection';
import { ConfirmDismissModal } from '@/components/jobs/ConfirmDismissModal';
import { Button } from '@/components/ui';

export default function JobsPage() {
  // Hooks
  const { stats, loading: statsLoading, refresh: refreshStats } = useJobStats();
  const {
    jobs,
    loading: jobsLoading,
    error: jobsError,
    markApplied,
    markDismissed,
    hasMore,
    loadMore,
    loadingMore,
    refresh: refreshJobs,
    filters,
    setFilters,
  } = useJobs();
  const {
    companies,
    loading: companiesLoading,
    crawlAll,
    crawlCompany,
    crawlingAll,
    crawlingCompanyId,
    refresh: refreshCompanies,
  } = useCompanies();

  // UI State
  const [pageFilters, setPageFilters] = useState<JobsPageFilters>({
    search: '',
    crawlStatus: 'all',
    showNewOnly: false,
    showApplied: false,
  });
  const [dismissModal, setDismissModal] = useState<{
    isOpen: boolean;
    job: JobListing | null;
  }>({ isOpen: false, job: null });

  // Refs for synchronized scrolling
  const companiesRef = useRef<HTMLDivElement>(null);
  const jobsRef = useRef<HTMLDivElement>(null);

  // Filter jobs for Top 10 (exclude applied and dismissed)
  const topJobs = jobs
    .filter(job => job.status !== 'applied' && job.status !== 'dismissed')
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
    .slice(0, 10);

  // Group jobs by company
  const jobsByCompany = companies.map(company => ({
    company,
    jobs: jobs.filter(job => job.companyId === company.id),
  }));

  // Handlers
  const handleRefreshAll = async () => {
    await crawlAll();
    await Promise.all([refreshJobs(), refreshStats(), refreshCompanies()]);
  };

  const handleDismissClick = (job: JobListing) => {
    setDismissModal({ isOpen: true, job });
  };

  const handleConfirmDismiss = async () => {
    if (dismissModal.job) {
      await markDismissed(dismissModal.job.id);
      setDismissModal({ isOpen: false, job: null });
    }
  };

  const handleCompanyClick = (companyId: number) => {
    // Scroll to company's jobs section
    const element = document.getElementById(`company-jobs-${companyId}`);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Jobs</h1>
          <Button
            variant="primary"
            onClick={handleRefreshAll}
            loading={crawlingAll}
          >
            Refresh All Jobs
          </Button>
        </div>

        {/* Stats Bar */}
        <StatsBar stats={stats} loading={statsLoading} />

        {/* Filters */}
        <JobFilters
          filters={pageFilters}
          onChange={setPageFilters}
        />

        {/* Error Display */}
        {jobsError && (
          <div className="p-4 bg-error/20 text-error rounded-md">
            {jobsError}
            <Button variant="ghost" size="sm" className="ml-4" onClick={refreshJobs}>
              Retry
            </Button>
          </div>
        )}

        {/* Top 10 Section */}
        <TopJobsSection
          jobs={topJobs}
          loading={jobsLoading}
          onMarkApplied={markApplied}
          onMarkNotInterested={handleDismissClick}
        />

        {/* Split View Section */}
        <CompanyJobsSection
          companies={companies}
          jobsByCompany={jobsByCompany}
          loading={companiesLoading || jobsLoading}
          onCompanyClick={handleCompanyClick}
          onCompanyRefresh={crawlCompany}
          crawlingCompanyId={crawlingCompanyId}
          onMarkApplied={markApplied}
          onMarkNotInterested={handleDismissClick}
          hasMore={hasMore}
          onLoadMore={loadMore}
          loadingMore={loadingMore}
          companiesRef={companiesRef}
          jobsRef={jobsRef}
        />

        {/* Confirm Dismiss Modal */}
        <ConfirmDismissModal
          isOpen={dismissModal.isOpen}
          onClose={() => setDismissModal({ isOpen: false, job: null })}
          onConfirm={handleConfirmDismiss}
          jobTitle={dismissModal.job?.title || ''}
          companyName={dismissModal.job?.companyName || ''}
        />
      </div>
    </Layout>
  );
}
```

---

### 7.2 Job Preferences Page

**File**: `packages/web/src/app/(pa)/pa/jobs/preferences/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { useJobProfile } from '@/hooks/useJobProfile';
import { JobPreferencesForm } from '@/components/jobs/JobPreferencesForm';
import { Button } from '@/components/ui';

export default function JobPreferencesPage() {
  const { profile, loading, error, saving, saveError, updateProfile } = useJobProfile();

  const [formData, setFormData] = useState({
    keywords: [] as string[],
    titles: [] as string[],
    locations: [] as string[],
    remoteOnly: false,
  });

  // Sync form with profile when loaded
  useEffect(() => {
    if (profile) {
      setFormData({
        keywords: profile.keywords,
        titles: profile.titles,
        locations: profile.locations,
        remoteOnly: profile.remoteOnly,
      });
    }
  }, [profile]);

  const handleSave = async () => {
    await updateProfile(formData);
  };

  return (
    <Layout>
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-semibold text-foreground mb-6">
          Job Preferences
        </h1>

        {error && (
          <div className="mb-4 p-4 bg-error/20 text-error rounded-md">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-foreground-secondary">Loading...</div>
        ) : (
          <JobPreferencesForm
            data={formData}
            onChange={setFormData}
            onSave={handleSave}
            saving={saving}
            error={saveError}
          />
        )}
      </div>
    </Layout>
  );
}
```

---

## 8. Error Handling

### 8.1 Error Handling Strategy

| Layer | Strategy |
|-------|----------|
| API calls | Try-catch with `ApiError` type checking |
| Hooks | Store error in state, expose via return value |
| Pages | Display error with retry button |
| Modals | Display inline error, keep modal open |
| Actions | Toast/inline error, don't disrupt flow |

### 8.2 Error Display Patterns

**Page-level error**:
```typescript
{error && (
  <div className="p-4 bg-error/20 text-error rounded-md flex items-center justify-between">
    <span>{error}</span>
    <Button variant="ghost" size="sm" onClick={refresh}>
      Retry
    </Button>
  </div>
)}
```

**Action error (inline)**:
```typescript
// In hook, catch and show error briefly, then clear
const markApplied = async (id: number) => {
  try {
    await jobsApi.updateJobStatus(id, 'applied');
    // Update local state
  } catch (err) {
    setError('Failed to update job status');
    setTimeout(() => setError(null), 3000);
    throw err;
  }
};
```

### 8.3 Crawl Error Handling

- Failed crawls update company `crawlStatus` to `'error'`
- Error shown on company card with last error message
- Per-company refresh button available to retry
- Full refresh continues with other companies on individual failure

---

## 9. Testing Plan

### 9.1 Unit Tests

**Components** (`__tests__/components/jobs/`):

| Component | Test Cases |
|-----------|------------|
| `MatchScoreBadge` | Renders correct color for each threshold (70+, 40-69, <40) |
| `JobCard` | Displays all fields, calls handlers on button click |
| `JobCardCompact` | Displays compact layout, opens apply link in new tab |
| `CompanyCard` | Shows correct status indicator, calls refresh handler |
| `TagInput` | Adds tags on Enter, removes on X click, handles duplicates |
| `ConfirmDismissModal` | Renders job info, calls onConfirm/onClose |

**Hooks** (`__tests__/hooks/`):

| Hook | Test Cases |
|------|------------|
| `useJobs` | Fetches on mount, handles filters, infinite scroll, status updates |
| `useCompanies` | Fetches companies, handles crawl state |
| `useJobProfile` | Fetches profile, saves updates |
| `useJobStats` | Fetches and formats stats |

### 9.2 Integration Tests

| Test | Description |
|------|-------------|
| Jobs page load | Renders stats, top 10, split view |
| Filter application | Filters update displayed jobs |
| Mark as applied | Job moves from top 10 to company section |
| Dismiss job | Confirmation shown, job removed from all views |
| Crawl all | Progress shown, data refreshed after |
| Crawl single company | Company shows loading, refreshes after |
| Preferences save | Updates saved, form reflects changes |
| Search | Filters both companies and jobs |
| Synchronized scroll | Scrolling jobs highlights company |
| Click company | Scrolls to company's jobs section |

### 9.3 E2E Tests (Playwright/Cypress)

```typescript
describe('Jobs Page', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/pa/jobs');
  });

  it('displays top 10 jobs sorted by match score', () => {
    cy.get('[data-testid="top-jobs-section"]')
      .find('[data-testid="job-card"]')
      .should('have.length.at.most', 10);

    // Verify descending order
    cy.get('[data-testid="match-score"]').then($scores => {
      const scores = [...$scores].map(el => parseInt(el.textContent));
      expect(scores).to.deep.equal([...scores].sort((a, b) => b - a));
    });
  });

  it('dismisses job with confirmation', () => {
    cy.get('[data-testid="dismiss-button"]').first().click();
    cy.get('[data-testid="confirm-modal"]').should('be.visible');
    cy.get('[data-testid="confirm-dismiss"]').click();
    cy.get('[data-testid="confirm-modal"]').should('not.exist');
  });

  it('marks job as applied without confirmation', () => {
    cy.get('[data-testid="applied-button"]').first().click();
    cy.get('[data-testid="confirm-modal"]').should('not.exist');
    // Job should disappear from top 10
  });

  it('refreshes all companies', () => {
    cy.get('[data-testid="refresh-all"]').click();
    cy.get('[data-testid="crawl-progress"]').should('be.visible');
    cy.get('[data-testid="crawl-progress"]', { timeout: 60000 }).should('not.exist');
  });

  it('opens apply link in new tab', () => {
    cy.get('[data-testid="apply-link"]')
      .first()
      .should('have.attr', 'target', '_blank')
      .and('have.attr', 'rel', 'noopener noreferrer');
  });
});

describe('Job Preferences', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/pa/jobs/preferences');
  });

  it('adds and removes keyword tags', () => {
    cy.get('[data-testid="keywords-input"]').type('operations{enter}');
    cy.get('[data-testid="keyword-tag"]').should('contain', 'operations');
    cy.get('[data-testid="remove-tag"]').click();
    cy.get('[data-testid="keyword-tag"]').should('not.exist');
  });

  it('saves preferences', () => {
    cy.get('[data-testid="keywords-input"]').type('strategy{enter}');
    cy.get('[data-testid="save-button"]').click();
    cy.get('[data-testid="save-success"]').should('be.visible');
  });
});
```

### 9.4 Mobile Testing

| Test | Description |
|------|-------------|
| Button visibility | Action buttons visible without hover |
| Touch targets | Buttons at least 44x44px |
| Scroll behavior | Smooth scrolling, no janky infinite scroll |
| Modal usability | Full-screen modal on mobile, easy to dismiss |

---

## 10. Implementation Checklist

### Phase 1: Foundation

- [ ] Add job types to `packages/web/src/lib/api.ts`
- [ ] Implement `jobs` API module in `api.ts`
- [ ] Create `packages/web/src/hooks/useJobs.ts`
- [ ] Create `packages/web/src/hooks/useCompanies.ts`
- [ ] Create `packages/web/src/hooks/useJobProfile.ts`
- [ ] Create `packages/web/src/hooks/useJobStats.ts`

### Phase 2: UI Components

- [ ] Create `packages/web/src/components/jobs/` directory
- [ ] Implement `MatchScoreBadge.tsx`
- [ ] Implement `TagInput.tsx`
- [ ] Implement `JobCard.tsx`
- [ ] Implement `JobCardCompact.tsx`
- [ ] Implement `CompanyCard.tsx`
- [ ] Implement `StatsBar.tsx`
- [ ] Implement `JobFilters.tsx`
- [ ] Implement `ConfirmDismissModal.tsx`
- [ ] Implement `CrawlProgressIndicator.tsx`

### Phase 3: Section Components

- [ ] Implement `TopJobsSection.tsx`
- [ ] Implement `CompanyPanel.tsx`
- [ ] Implement `JobsPanel.tsx`
- [ ] Implement `CompanyJobsSection.tsx` (split view container)
- [ ] Implement synchronized scrolling logic
- [ ] Implement click-to-jump navigation

### Phase 4: Pages

- [ ] Create `packages/web/src/app/(pa)/pa/jobs/page.tsx`
- [ ] Create `packages/web/src/app/(pa)/pa/jobs/preferences/page.tsx`
- [ ] Add "Jobs" to sidebar navigation
- [ ] Implement infinite scroll

### Phase 5: Features

- [ ] Implement search functionality (unified search)
- [ ] Implement filter controls
- [ ] Implement "new since last refresh" filter
- [ ] Implement "show applied" filter
- [ ] Implement crawl status filter

### Phase 6: Testing

- [ ] Write unit tests for components
- [ ] Write unit tests for hooks
- [ ] Write integration tests
- [ ] Write E2E tests
- [ ] Test on mobile devices

### Phase 7: Polish

- [ ] Add loading skeletons
- [ ] Add empty states
- [ ] Verify accessibility (keyboard nav, screen readers)
- [ ] Performance optimization (virtualization if needed)
- [ ] Code review and cleanup

---

## Appendix A: Sidebar Navigation Update

Add to `packages/web/src/components/layout/Sidebar.tsx`:

```typescript
const navItems = [
  { name: 'Dashboard', href: '/pa/dashboard', icon: HomeIcon },
  { name: 'Notes', href: '/pa/notes', icon: DocumentIcon },
  { name: 'Actions', href: '/pa/actions', icon: CheckCircleIcon },
  { name: 'Jobs', href: '/pa/jobs', icon: BriefcaseIcon },  // Add this
  { name: 'Blog', href: '/pa/blog', icon: PencilIcon },
];
```

---

## Appendix B: API Response Examples

### GET /jobs/listings

```json
{
  "listings": [
    {
      "id": 1,
      "companyId": 5,
      "companyName": "Acme Corp",
      "externalId": "gh_12345",
      "title": "Senior Product Manager",
      "url": "https://boards.greenhouse.io/acme/jobs/12345",
      "location": "London, UK",
      "remote": true,
      "department": "Product",
      "description": "We are looking for a Senior PM...",
      "postedAt": "2025-12-20T10:00:00Z",
      "firstSeenAt": "2025-12-21T08:00:00Z",
      "lastSeenAt": "2025-12-28T08:00:00Z",
      "status": "new",
      "matchScore": 85
    }
  ],
  "total": 156,
  "limit": 20,
  "offset": 0
}
```

### GET /jobs/listings/stats

```json
{
  "totalJobs": 156,
  "totalCompanies": 24,
  "newSinceLastRefresh": 12,
  "applicationsSubmitted": 3,
  "lastRefreshAt": "2025-12-28T06:00:00Z"
}
```

### GET /jobs/companies

```json
{
  "companies": [
    {
      "id": 5,
      "name": "Acme Corp",
      "careerPageUrl": "https://boards.greenhouse.io/acme",
      "atsType": "greenhouse",
      "active": true,
      "createdAt": "2025-12-01T10:00:00Z",
      "updatedAt": "2025-12-28T08:00:00Z"
    }
  ],
  "total": 24
}
```

---

## Appendix C: Design Mockups

### Jobs Page Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [≡] Personal Assistant                                    [User ▾]      │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌───────────┐                                                           │
│ │ Dashboard │  Jobs                                  [Refresh All Jobs] │
│ │ Notes     │  ─────────────────────────────────────────────────────── │
│ │ Actions   │  156 Jobs • 24 Companies • 12 New • 3 Applied • 2h ago   │
│ │ ● Jobs    │  ─────────────────────────────────────────────────────── │
│ │ Blog      │  [Search...        ] [Crawl Status ▾] [☐ New] [☐ Applied]│
│ └───────────┘  ─────────────────────────────────────────────────────── │
│                                                                         │
│                TOP 10 MOST RELEVANT JOBS                                │
│                ─────────────────────────────────────────────────────── │
│                ┌─────────────────────────────────────────────────────┐ │
│                │ [92%] Senior Product Manager                        │ │
│                │ Acme Corp • London, UK (Remote)                     │ │
│                │ Lead product strategy for our core platform...      │ │
│                │ $120k-$150k • Discovered Dec 28                     │ │
│                │ [Apply →]        [Applied] [Not Interested]         │ │
│                └─────────────────────────────────────────────────────┘ │
│                ┌─────────────────────────────────────────────────────┐ │
│                │ [87%] VP of Operations                              │ │
│                │ TechStart • Dublin, Ireland                         │ │
│                │ ...                                                 │ │
│                └─────────────────────────────────────────────────────┘ │
│                                                                         │
│                COMPANIES & JOBS                                         │
│                ─────────────────────────────────────────────────────── │
│                ┌─────────────────┬───────────────────────────────────┐ │
│                │ Companies       │ Jobs                              │ │
│                │ ───────────     │ ─────                             │ │
│                │ ┌─────────────┐ │ ACME CORP (12 jobs)               │ │
│                │ │ [Logo] Acme │ │ ┌─────────────────────────────┐   │ │
│                │ │ ● Working   │ │ │ [92%] Senior PM • London    │   │ │
│                │ │ 2h ago      │ │ │ [Apply] [Applied] [Dismiss] │   │ │
│                │ │ 12 jobs [↻] │ │ └─────────────────────────────┘   │ │
│                │ └─────────────┘ │ ┌─────────────────────────────┐   │ │
│                │ ┌─────────────┐ │ │ [78%] PM Lead • Remote      │   │ │
│                │ │ [Logo] Beta │ │ │ [Apply] [Applied] [Dismiss] │   │ │
│                │ │ ○ Manual    │ │ └─────────────────────────────┘   │ │
│                │ │ Never       │ │                                   │ │
│                │ │ 0 jobs  [↻] │ │ BETA INC (3 jobs)                 │ │
│                │ └─────────────┘ │ ...                               │ │
│                └─────────────────┴───────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Job Preferences Page Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [≡] Personal Assistant                                    [User ▾]      │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌───────────┐                                                           │
│ │ Dashboard │  Job Preferences                                          │
│ │ Notes     │  ──────────────────────────────────────────               │
│ │ Actions   │                                                           │
│ │ ● Jobs    │  Keywords                                                 │
│ │ Blog      │  ┌────────────────────────────────────────┐               │
│ └───────────┘  │ [operations ×] [strategy ×] [product ×]│               │
│                │ [Type and press Enter...]              │               │
│                └────────────────────────────────────────┘               │
│                                                                         │
│                Job Titles                                               │
│                ┌────────────────────────────────────────┐               │
│                │ [Head of ×] [VP ×] [Director ×]        │               │
│                │ [Type and press Enter...]              │               │
│                └────────────────────────────────────────┘               │
│                                                                         │
│                Locations                                                │
│                ┌────────────────────────────────────────┐               │
│                │ [London ×] [Remote ×] [Dublin ×]       │               │
│                │ [Type and press Enter...]              │               │
│                └────────────────────────────────────────┘               │
│                                                                         │
│                [✓] Remote Only                                          │
│                                                                         │
│                [Save Preferences]                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

*End of Specification*
