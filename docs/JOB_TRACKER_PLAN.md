# Job Tracker & Career Page Crawler - Implementation Plan

## Overview

A tool to maintain a list of target companies, crawl their career pages on demand, and surface job listings that match your profile keywords.

## Database Schema

### New Prisma Models

```prisma
// Company to track
model Company {
  id            Int       @id @default(autoincrement())
  userId        Int
  name          String
  careerPageUrl String
  atsType       String?   // greenhouse, lever, workday, ashby, smartrecruiters, custom
  active        Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  jobs          JobListing[]
  crawlLogs     CrawlLog[]

  @@unique([userId, name])
  @@index([userId])
  @@map("companies")
}

// User's job search preferences
model JobProfile {
  id            Int       @id @default(autoincrement())
  userId        Int       @unique
  keywords      String[]  // e.g., ["operations", "product", "strategy"]
  titles        String[]  // e.g., ["Head of", "VP", "Director"]
  locations     String[]  // e.g., ["London", "Remote", "UK"]
  remoteOnly    Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("job_profiles")
}

// Scraped job listings
model JobListing {
  id            Int       @id @default(autoincrement())
  companyId     Int
  externalId    String    // Job ID from the source
  title         String
  url           String
  location      String?
  remote        Boolean   @default(false)
  department    String?
  description   String?   @db.Text
  postedAt      DateTime?
  firstSeenAt   DateTime  @default(now())
  lastSeenAt    DateTime  @default(now())
  status        String    @default("new") // new, viewed, applied, dismissed
  matchScore    Float?    // Calculated match against profile

  company       Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, externalId])
  @@index([companyId])
  @@index([status])
  @@index([matchScore])
  @@map("job_listings")
}

// Crawl run history
model CrawlLog {
  id            Int       @id @default(autoincrement())
  companyId     Int
  startedAt     DateTime  @default(now())
  completedAt   DateTime?
  status        String    @default("running") // running, success, failed
  jobsFound     Int       @default(0)
  newJobs       Int       @default(0)
  error         String?

  company       Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([companyId])
  @@map("crawl_logs")
}
```

## ATS Detection & Parsing Strategy

### Supported ATS Platforms (JSON APIs - no scraping needed)

| ATS | Detection Pattern | API Endpoint |
|-----|-------------------|--------------|
| Greenhouse | `boards.greenhouse.io/{company}` or `{company}.greenhouse.io` | `https://boards-api.greenhouse.io/v1/boards/{company}/jobs` |
| Lever | `jobs.lever.co/{company}` | `https://api.lever.co/v0/postings/{company}` |
| Ashby | `jobs.ashbyhq.com/{company}` | `https://api.ashbyhq.com/posting-api/job-board/{company}` |
| SmartRecruiters | `careers.smartrecruiters.com/{company}` | `https://api.smartrecruiters.com/v1/companies/{company}/postings` |

### Custom/Unknown Pages (Headless Browser)

For companies with custom career pages or unsupported ATS:
- Use **Playwright** to render JavaScript
- Extract job listings via common patterns (job cards, lists)
- Store raw HTML for debugging

## MCP Tools

### Company Management
- `add_job_company` - Add a company to track (name, career URL)
- `list_job_companies` - List all tracked companies
- `update_job_company` - Update company details
- `remove_job_company` - Remove a company

### Profile Management
- `set_job_profile` - Set/update search keywords, titles, locations
- `get_job_profile` - View current profile

### Crawling & Results
- `crawl_jobs` - Trigger crawl (optional: specific company ID)
- `get_job_matches` - Get matching jobs (filters: company, status, min score)
- `update_job_status` - Mark job as viewed/applied/dismissed
- `get_crawl_history` - View recent crawl logs

## API Endpoints

```
POST   /api/v1/jobs/companies              - Add company
GET    /api/v1/jobs/companies              - List companies
PUT    /api/v1/jobs/companies/:id          - Update company
DELETE /api/v1/jobs/companies/:id          - Delete company

GET    /api/v1/jobs/profile                - Get job profile
PUT    /api/v1/jobs/profile                - Set/update profile

POST   /api/v1/jobs/crawl                  - Trigger crawl
GET    /api/v1/jobs/crawl/history          - Get crawl logs

GET    /api/v1/jobs/listings               - Get job listings (with filters)
PUT    /api/v1/jobs/listings/:id/status    - Update job status
```

## Matching Algorithm

Simple keyword matching with scoring:

```typescript
function calculateMatchScore(job: JobListing, profile: JobProfile): number {
  let score = 0;
  const titleLower = job.title.toLowerCase();
  const descLower = (job.description || '').toLowerCase();
  const locationLower = (job.location || '').toLowerCase();

  // Title matches (high weight)
  for (const title of profile.titles) {
    if (titleLower.includes(title.toLowerCase())) {
      score += 30;
    }
  }

  // Keyword matches in title (high weight)
  for (const keyword of profile.keywords) {
    if (titleLower.includes(keyword.toLowerCase())) {
      score += 20;
    }
  }

  // Keyword matches in description (lower weight)
  for (const keyword of profile.keywords) {
    if (descLower.includes(keyword.toLowerCase())) {
      score += 5;
    }
  }

  // Location matches
  for (const location of profile.locations) {
    if (locationLower.includes(location.toLowerCase())) {
      score += 15;
    }
  }

  // Remote preference
  if (profile.remoteOnly && !job.remote) {
    score -= 50; // Penalty for non-remote when remote-only
  } else if (job.remote) {
    score += 10; // Bonus for remote jobs
  }

  return Math.max(0, score);
}
```

## Implementation Phases

### Phase 1: Foundation (Database + Basic CRUD)
1. Add Prisma models to schema
2. Run migration
3. Create API routes, controllers, services for Company and JobProfile
4. Create MCP tools for company/profile management
5. Test basic CRUD operations

### Phase 2: ATS Parsers (JSON APIs)
1. Create parser interface and factory
2. Implement Greenhouse parser
3. Implement Lever parser
4. Implement Ashby parser
5. Create ATS detection function
6. Add crawl endpoint and MCP tool

### Phase 3: Headless Browser Support
1. Add Playwright as dependency
2. Create generic HTML parser
3. Implement common job listing extraction patterns
4. Add fallback for unknown ATS types

### Phase 4: Matching & Polish
1. Implement matching algorithm
2. Add match score to job listings
3. Create filtered job listing queries
4. Add job status management
5. Add crawl history/logging

## Dependencies to Add

```json
{
  "playwright": "^1.40.0"  // For headless browser crawling
}
```

## Example Usage Flow

```
User: Add Anthropic to my job tracker
> Adds company with career URL https://www.anthropic.com/careers

User: Set my job profile - I'm looking for operations, strategy roles,
      Head of or Director level, in London or Remote
> Saves profile with keywords, titles, locations

User: Crawl all my companies for jobs
> Triggers crawl, detects ATS types, fetches jobs, calculates match scores

User: Show me matching jobs
> Returns job listings sorted by match score, filtered by status=new
```

## Security Considerations

- Rate limiting on crawl endpoint (prevent abuse)
- User-scoped data (all queries filtered by userId)
- Respect robots.txt where possible
- Add delays between requests to avoid IP bans
- Store minimal job data (no sensitive information)

## Future Enhancements (Out of Scope for V1)

- Scheduled crawling (cron job)
- Email/notification on new matches
- LinkedIn job board integration (complex due to restrictions)
- Application tracking integration
- Resume keyword extraction
