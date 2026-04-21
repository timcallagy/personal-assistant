# Babblo CMS + Email Automation — Todo

## Phase 0 — Infrastructure (Manual)
- [ ] Add `region: frankfurt` to `pa-api` and `pa-web` in `render.yaml`
- [ ] Add `BABBLO_DATABASE_URL` env var to `pa-api` in Render dashboard
- [ ] Add `RESEND_API_KEY` env var to `pa-api` in Render dashboard
- [ ] Add `ANTHROPIC_API_KEY` env var to `pa-api` in Render dashboard
- [ ] Add translation script to `pa-api` build command in `render.yaml`

## Prompt 1 — Babblo DB Client ✅
- [x] Add `pg` and `@types/pg` to `packages/api/package.json`
- [x] Create `packages/api/src/lib/babblo-db.ts` with singleton pool
- [x] Export `babbloQuery<T>` helper function
- [x] Export `connectBabbloDb()` with SELECT 1 health check
- [x] Wire `connectBabbloDb()` into `packages/api/src/index.ts` at startup (non-fatal)
- [x] Add `BABBLO_DATABASE_URL` to `.env.example`

## Prompt 2 — Babblo Query Functions ✅
- [x] Create `packages/api/src/lib/babblo-queries.ts`
- [x] Define TypeScript interfaces for all return types
- [x] Implement `getBabbloUserList(page, pageSize, stageFilter?)` with lifecycle stage CASE logic
- [x] Implement `getBabbloStats()` with single conditional COUNT query
- [x] Implement `getBabbloUserProfile(userId)` — profile + calls + corrections + memory + cost + transactions

## Prompt 3 — API: User List + Stats Endpoints ✅
- [x] Create `packages/api/src/controllers/babblo.ts`
- [x] Implement `listBabbloUsers` controller with pagination + stage filter validation
- [x] Implement `getBabbloStatsController`
- [x] Create `packages/api/src/routes/babblo.ts` with `sessionAuth` on all routes
- [x] Mount `GET /` → `listBabbloUsers`
- [x] Mount `GET /stats` → `getBabbloStatsController`
- [x] Register babblo router at `/babblo` in `packages/api/src/routes/index.ts`

## Prompt 4 — API: User Profile Endpoint ✅
- [x] Implement `getBabbloUserProfileController` in `packages/api/src/controllers/babblo.ts`
- [x] Add UUID validation (regex)
- [x] Handle 404 when user not found
- [x] Mount `GET /:id` in `packages/api/src/routes/babblo.ts` (after `/stats`)

## Prompt 5 — Web: Layout + Navigation ✅
- [x] Add "Babblo CMS" nav link to Sidebar (`packages/web/src/components/layout/Sidebar.tsx`)
- [x] Create placeholder `packages/web/src/app/(pa)/babblo/page.tsx` (replaced in Prompt 6)
- [x] Auth protection inherited from `Layout` component (same as rest of PA)

## Prompt 6 — Web: User List Page ✅
- [x] Build stats bar (4 cards, one per lifecycle stage, clickable filter)
- [x] Build user table with all required columns
- [x] Add pagination (Previous/Next, page X of Y)
- [x] Add stage filter (active card highlighted, click to clear)
- [x] Add loading state
- [x] Add error state
- [x] Add Babblo API types + methods to `packages/web/src/lib/api.ts`

## Prompt 7 — Web: User Profile Page ✅
- [x] Create `packages/web/src/app/(pa)/babblo/[userId]/page.tsx`
- [x] Build profile header (name, id, stage badge, bonus, languages, minutes, back link)
- [x] Build cost & revenue stat boxes
- [x] Build call history table with expandable corrections rows
- [x] Build persona memory cards
- [x] Build transaction history table
- [x] Handle loading state
- [x] Handle 404 (user not found)

## Prompt 8 — Email Infrastructure ✅
- [x] Add `SentEmail` model to `packages/api/prisma/schema.prisma`
- [x] Regenerate Prisma client (`prisma generate`)
- [ ] Run Prisma migration (`prisma migrate dev --name add_sent_emails`) — requires DB connection
- [x] Install `resend` npm package in `packages/api`
- [x] Create `packages/api/src/lib/email.ts` with Resend client
- [x] Implement `sendEmail()` with deduplication check (read sent_emails before send)
- [x] Write `sent_emails` row on successful send
- [x] Export `EMAIL_TYPES` constants object
- [x] Add `RESEND_API_KEY` to `.env.example`

## Prompt 9 — Email Templates + Translation ✅
- [x] Create `packages/api/src/email-templates/types.ts` with `EmailTemplate` interface
- [x] Create `packages/api/src/email-templates/en/trial_not_started_1.ts`
- [x] Create `packages/api/src/email-templates/en/trial_not_started_2.ts`
- [x] Create `packages/api/src/email-templates/en/trial_active_1.ts`
- [x] Create `packages/api/src/email-templates/en/trial_active_2.ts`
- [x] Create `packages/api/src/email-templates/en/trial_exhausted_1.ts`
- [x] Create `packages/api/src/email-templates/translate.ts` (Claude API build script)
- [x] Support `--force` flag to overwrite existing translations
- [x] Skip existing files without `--force`
- [x] Create `packages/api/src/email-templates/index.ts` with `getTemplate()` and `renderTemplate()`
- [x] Fallback to `en/` if language file doesn't exist
- [x] Add `@anthropic-ai/sdk` to `packages/api/package.json`

## Prompt 10 — Cron Jobs ✅
- [x] Install `node-cron` and `@types/node-cron` in `packages/api`
- [x] Create `packages/api/src/jobs/email-cron.ts`
- [x] Implement `getUserEmail` via SQL query in each job
- [x] Implement Job 1: `trial_not_started_email_1` (day 1, 09:00 UTC)
- [x] Implement Job 2: `trial_not_started_email_2` (day 4, 09:00 UTC)
- [x] Implement Job 3: `trial_active_email_1` (day 2, 09:00 UTC)
- [x] Implement Job 4: `trial_active_email_2` (day 7+, no call in 5 days, 09:00 UTC)
- [x] Implement Job 5: `trial_exhausted_email_1` (balance=0, within 48h, 09:00 UTC)
- [x] Wrap all jobs in try/catch (non-fatal)
- [x] Log job name, users found, sent, skipped for each run
- [x] Create `packages/api/src/jobs/index.ts` with `startEmailJobs()`
- [x] Call `startEmailJobs()` in `packages/api/src/index.ts` after server starts

## Prompt 11 — Babblo App: display_name (separate codebase)
- [ ] Write migration SQL to add nullable `display_name TEXT` to `profiles` table
- [ ] Exclude `display_name` from `DO UPDATE SET` clause in profiles upsert
- [ ] Add Auth0 Management API token fetch (client credentials flow, cached with expiry)
- [ ] Call Auth0 Management API at signup to get user `name`
- [ ] Include `display_name` in INSERT clause of profiles upsert
- [ ] Graceful fallback to NULL if Auth0 call fails
- [ ] Add `AUTH0_DOMAIN`, `AUTH0_MGMT_CLIENT_ID`, `AUTH0_MGMT_CLIENT_SECRET` to env
