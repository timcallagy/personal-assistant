# Babblo CMS + Email Automation — Build Plan

## Stack Context

- **Monorepo:** pnpm workspaces + Turborepo
- **`packages/api`:** Express.js + TypeScript + Prisma ORM (PA's own PostgreSQL DB)
- **`packages/web`:** Next.js + TypeScript (App Router)
- **`packages/shared`:** Shared types
- **PA Auth:** Session-based (username/password). Middleware: `sessionAuth`.
- **PA DB:** PostgreSQL via Prisma — migrations live in `packages/api/prisma/`
- **Babblo DB:** Separate PostgreSQL instance (Frankfurt). Read-only access from PA API via raw `pg` client.
- **Deployment:** Render (migrating from Oregon to Frankfurt)

---

## Blueprint

### Phase 0 — Infrastructure
- Migrate PA Render services to Frankfurt region
- Add `BABBLO_DATABASE_URL` env var (read-only connection string) to PA API service

### Phase 1 — Babblo DB data layer
- Add a second DB client (`pg`) in the PA API that connects to the Babblo DB (read-only)
- Write typed SQL query functions: user list with lifecycle stage, summary stats, user profile detail

### Phase 2 — CMS API endpoints
- `GET /api/v1/babblo/users` — paginated user list, filterable by lifecycle stage
- `GET /api/v1/babblo/stats` — summary counts by lifecycle stage
- `GET /api/v1/babblo/users/:id` — full user profile detail

### Phase 3 — CMS Web UI
- Auth-protected `/babblo` section in the `(pa)` Next.js app
- User list page: summary stats bar + filterable table with pagination
- User profile page: calls, persona memory, cost/revenue, transactions

### Phase 4 — Email infrastructure
- Prisma migration: `sent_emails` table in PA DB for deduplication tracking
- Resend client wrapper with deduplication check built in
- Email template interface + base layout (plain text + HTML)
- Translation script: calls Claude API at build time to generate 11-language versions of all templates

### Phase 5 — Email templates
- 5 templates in English, each translated to 11 languages by the build script

### Phase 6 — Cron jobs
- Daily batch scheduler (node-cron or Render cron service)
- One job per email trigger condition, each querying Babblo DB, checking deduplication, and sending via Resend

### Phase 7 — Babblo app: display_name
- Separate work in the Babblo codebase (not the PA app)
- Add `display_name` column to `profiles` table
- Pull from Auth0 user profile at signup and persist

---

## Chunk Breakdown

```
Phase 0
  └─ P0: render.yaml + env vars (manual config, no prompt needed)

Phase 1
  ├─ Step 1: Babblo pg client setup
  └─ Step 2: Babblo query functions (list, stats, profile)

Phase 2
  ├─ Step 3: /babblo/users + /babblo/stats endpoints
  └─ Step 4: /babblo/users/:id endpoint

Phase 3
  ├─ Step 5: /babblo layout + navigation in web app
  ├─ Step 6: User list page (stats + table)
  └─ Step 7: User profile page

Phase 4
  ├─ Step 8: sent_emails migration + Resend client + deduplication
  └─ Step 9: Template system + translation build script

Phase 5
  └─ Step 10: All 5 email templates (English source)

Phase 6
  └─ Step 11: Cron jobs for all 5 email triggers

Phase 7
  └─ Step 12: Babblo app — display_name (separate codebase)
```

---

## Prompts

---

### Prompt 1 — Babblo DB client

```
You are working in a Node.js/TypeScript monorepo. The project is a Personal Assistant web app.
The relevant package is `packages/api` — an Express.js + TypeScript API that already uses Prisma
for its own PostgreSQL database.

We need to add a second, read-only database connection to a separate PostgreSQL instance
(the Babblo app database). This must NOT use Prisma — use the `pg` npm package directly
with raw SQL, as we do not own the Babblo schema and will never run migrations against it.

Tasks:
1. Add `pg` and `@types/pg` as dependencies to `packages/api/package.json`.
2. Create `packages/api/src/lib/babblo-db.ts` that:
   - Reads `BABBLO_DATABASE_URL` from the environment (throw a clear error if missing in production).
   - Creates and exports a singleton `pg.Pool` instance named `babbloDb`.
   - Exports a typed helper function `babbloQuery<T>(sql: string, params?: unknown[]): Promise<T[]>`
     that executes a query and returns typed rows.
   - Exports a `connectBabbloDb()` function that runs a simple `SELECT 1` to verify connectivity
     and logs success or failure.
3. Call `connectBabbloDb()` in `packages/api/src/index.ts` at startup (alongside the existing
   Prisma connect call), but do not crash the process if it fails — log a warning instead,
   so the PA app still starts if the Babblo DB is temporarily unreachable.
4. Add `BABBLO_DATABASE_URL` to any `.env.example` file if one exists.

Do not add any routes or controllers yet. This step is purely the DB client setup.
```

---

### Prompt 2 — Babblo query functions

```
You are working in `packages/api/src/lib/babblo-db.ts` and will add a new file alongside it.
The `babbloQuery<T>` helper and `babbloDb` pool are already set up in `babblo-db.ts`.

The Babblo PostgreSQL database has the following relevant tables (read-only access):

  profiles (id UUID, created_at TIMESTAMPTZ, display_name TEXT nullable, native_language TEXT,
            target_language TEXT, app_review_bonus_used BOOLEAN)
  user_balance (user_id UUID FK profiles.id, balance_seconds INTEGER, created_at TIMESTAMPTZ)
  conversation_sessions (id UUID, user_id UUID, created_at TIMESTAMPTZ, duration_seconds INTEGER,
                         language TEXT, persona_name TEXT)
  corrections (session_id UUID FK conversation_sessions.id, original TEXT, corrected TEXT)
  persona_rolling_memory (user_id UUID, persona_name TEXT, memory_text TEXT, updated_at TIMESTAMPTZ)
  token_usage (user_id UUID, cost_usd NUMERIC, created_at TIMESTAMPTZ)
  transactions (id UUID, user_id UUID, transaction_type TEXT, amount_seconds INTEGER,
                created_at TIMESTAMPTZ)
  first_purchases (user_id UUID, created_at TIMESTAMPTZ)
  referrals (referrer_id UUID, referred_id UUID, created_at TIMESTAMPTZ)

Lifecycle stage logic (derived, not stored):
  - trial_not_started: balance_seconds = 600 (full, untouched)
  - trial_active:      balance_seconds BETWEEN 1 AND 599
  - trial_exhausted:   balance_seconds = 0 AND no row in first_purchases for this user
  - purchased:         row exists in first_purchases for this user

bonus_requested = true if:
  - profiles.app_review_bonus_used = true, OR
  - user appears as referrer_id in the referrals table

Create `packages/api/src/lib/babblo-queries.ts` with the following exported async functions.
All functions use `babbloQuery` from `babblo-db.ts`. Define TypeScript interfaces for all
return types at the top of the file.

1. `getBabbloUserList(page: number, pageSize: number, stageFilter?: string)`
   Returns: array of { userId, createdAt, lifecycleStage, bonusRequested, callsMade,
   minutesPurchased, minutesRemaining } plus a total count for pagination.
   Compute lifecycleStage and bonusRequested in SQL using CASE expressions and EXISTS subqueries.

2. `getBabbloStats()`
   Returns: { trialNotStarted: number, trialActive: number, trialExhausted: number,
   purchased: number, total: number }
   Use a single query with conditional COUNT.

3. `getBabbloUserProfile(userId: string)`
   Returns an object with:
   - profile: { userId, createdAt, displayName, nativeLanguage, targetLanguage,
                lifecycleStage, bonusRequested, minutesRemaining }
   - calls: array of { sessionId, createdAt, durationSeconds, language, personaName,
                        corrections: [{ original, corrected }] }
     (fetch corrections in a second query, join in JS — keep queries simple)
   - personaMemory: array of { personaName, memoryText, updatedAt }
   - totalCostUsd: number (SUM of token_usage.cost_usd)
   - totalRevenueSeconds: number (SUM of transactions.amount_seconds where type is a purchase)
   - transactions: array of { id, type, amountSeconds, createdAt }

Keep all SQL as parameterised queries (no string interpolation of user input).
```

---

### Prompt 3 — CMS API: user list and stats endpoints

```
You are working in `packages/api` of a Node.js/TypeScript Express monorepo.

The following already exist:
- `packages/api/src/lib/babblo-queries.ts` with exported functions:
  `getBabbloUserList`, `getBabbloStats` (see their signatures from the previous step)
- Route files follow the pattern: `packages/api/src/routes/<name>.ts`
- Controller files follow the pattern: `packages/api/src/controllers/<name>.ts`
- Auth middleware `sessionAuth` is imported from `./middleware/index.js`
- The main router is in `packages/api/src/routes/index.ts` and mounts sub-routers

Create the following:

1. `packages/api/src/controllers/babblo.ts`
   - `listBabbloUsers`: reads `page` (default 1), `pageSize` (default 50, max 100), and
     `stage` (optional) from `req.query`. Calls `getBabbloUserList`. Returns
     `{ data, total, page, pageSize }`.
   - `getBabbloStatsController`: calls `getBabbloStats`. Returns the stats object.

2. `packages/api/src/routes/babblo.ts`
   - Mount `sessionAuth` on all routes in this file.
   - `GET /` → `listBabbloUsers`
   - `GET /stats` → `getBabbloStatsController`

3. In `packages/api/src/routes/index.ts`, mount the new babblo router at `/babblo`.

Do not add the user profile endpoint yet — that comes next.
Validate query params (page must be a positive integer, stage must be one of the four
valid values if provided) and return 400 with a clear message if invalid.
```

---

### Prompt 4 — CMS API: user profile endpoint

```
You are working in `packages/api/src/controllers/babblo.ts` and
`packages/api/src/routes/babblo.ts`.

The following already exists:
- `getBabbloUserProfile(userId: string)` in `packages/api/src/lib/babblo-queries.ts`
  which returns profile, calls (with corrections), personaMemory, totalCostUsd,
  totalRevenueSeconds, and transactions.
- The babblo router already has GET / and GET /stats.

Add:
1. In `packages/api/src/controllers/babblo.ts`:
   - `getBabbloUserProfileController`: reads `req.params.id` (a UUID string).
     Validates it is a valid UUID format (use a simple regex). Returns 400 if invalid.
     Calls `getBabbloUserProfile`. Returns 404 with `{ error: 'User not found' }` if the
     profile is null. Otherwise returns the full profile object.

2. In `packages/api/src/routes/babblo.ts`:
   - Add `GET /:id` → `getBabbloUserProfileController`
     (ensure this route comes AFTER `/stats` to avoid `:id` swallowing the stats route)

No other changes needed.
```

---

### Prompt 5 — CMS web app: layout and navigation

```
You are working in `packages/web` — a Next.js 14 App Router TypeScript application.

The existing structure has:
- `src/app/(pa)/` — the Personal Assistant section, with its own `layout.tsx`
- `src/app/(pa)/pa/` — existing PA pages

We need to add a Babblo CMS section at `src/app/(pa)/babblo/`.

The PA API base URL is available via the `NEXT_PUBLIC_API_URL` environment variable.
The app uses session-based auth — check for a session cookie/API call to determine if the
user is logged in. Look at how existing (pa) pages handle auth and follow the same pattern.

Tasks:
1. Create `src/app/(pa)/babblo/layout.tsx`:
   - Wraps all Babblo CMS pages in a consistent layout.
   - Shows a header: "Babblo CMS" with a nav link back to the main PA.
   - Applies auth protection consistent with the rest of the (pa) section.

2. Create `src/app/(pa)/babblo/page.tsx` as a minimal placeholder:
   - Renders a heading "Babblo Users" and the text "Loading..." for now.
   - This will be replaced in the next step.

3. Add a "Babblo" link to the existing `(pa)` navigation (wherever the PA nav links live —
   read the existing layout.tsx to find the right place).

Follow the existing code style exactly (same import patterns, same component structure,
same Tailwind class conventions if Tailwind is in use).
```

---

### Prompt 6 — CMS web app: user list page

```
You are working in `packages/web/src/app/(pa)/babblo/page.tsx`.

The PA API is at `NEXT_PUBLIC_API_URL`. The following endpoints are available:
- `GET /api/v1/babblo/stats` → `{ trialNotStarted, trialActive, trialExhausted, purchased, total }`
- `GET /api/v1/babblo/users?page=1&pageSize=50&stage=<optional>` →
  `{ data: [...], total, page, pageSize }`

Each user in `data` has:
  { userId, createdAt, lifecycleStage, bonusRequested, callsMade, minutesPurchased, minutesRemaining }

Replace the placeholder `page.tsx` with a full implementation:

1. **Stats bar** at the top — 4 cards, one per lifecycle stage, showing the count.
   Clicking a card filters the table to that stage.

2. **User table** with columns:
   User ID (truncated, click to navigate to /babblo/[userId]), Created At, Stage
   (badge with colour per stage), Bonus Requested (✓ or —), Calls Made, Minutes Purchased,
   Minutes Remaining.

3. **Pagination** — Previous / Next buttons, showing "Page X of Y".

4. **Stage filter** — clicking a stats card sets the active filter; clicking again clears it.
   The active card should be visually highlighted.

5. Fetch data client-side using `useEffect` + `fetch` (or SWR if it's already a dependency —
   check package.json). Show a loading skeleton while fetching. Show an error state if the
   fetch fails.

Keep the component in one file. Extract small sub-components (StatsCard, UserRow) as named
functions within the same file if needed for readability, but do not create separate files.
Use the same Tailwind/styling conventions as the rest of the (pa) section.
```

---

### Prompt 7 — CMS web app: user profile page

```
You are working in `packages/web/src/app/(pa)/babblo/[userId]/page.tsx` (create this file).

The PA API endpoint `GET /api/v1/babblo/users/:id` returns:
{
  profile: { userId, createdAt, displayName, nativeLanguage, targetLanguage,
             lifecycleStage, bonusRequested, minutesRemaining },
  calls: [{ sessionId, createdAt, durationSeconds, language, personaName,
             corrections: [{ original, corrected }] }],
  personaMemory: [{ personaName, memoryText, updatedAt }],
  totalCostUsd: number,
  totalRevenueSeconds: number,
  transactions: [{ id, type, amountSeconds, createdAt }]
}

Build the profile page with these sections:

1. **Header** — display_name (or "Anonymous" if null), userId, lifecycle stage badge,
   bonus_requested indicator, native → target language, minutes remaining, back link to /babblo.

2. **Cost & Revenue** — two stat boxes: "Total Cost" (USD, 4 decimal places) and
   "Total Revenue" (convert amountSeconds to minutes, show as "X min purchased").

3. **Call History** — table: Date, Duration (mm:ss), Language, Persona.
   Each row is expandable (click to toggle) to show the corrections for that call
   as a nested list: "Said: X → Should be: Y". If no corrections, show "No corrections".

4. **Persona Memory** — one card per persona showing personaName, updatedAt, and memoryText
   in a `<pre>` or monospace block.

5. **Transaction History** — table: Date, Type, Amount (convert seconds to minutes, e.g. "30 min").

Fetch data client-side. Show a loading state. Handle 404 (user not found) gracefully with
a "User not found" message and a back link. Follow the same styling conventions as the
user list page.
```

---

### Prompt 8 — Email infrastructure: sent_emails table + Resend client

```
You are working in `packages/api` of the monorepo.

Tasks:

1. **Prisma migration** — Add a `SentEmail` model to `packages/api/prisma/schema.prisma`:

   model SentEmail {
     id        Int      @id @default(autoincrement())
     userId    String   @map("user_id")      // Babblo user UUID (not a FK — different DB)
     emailType String   @map("email_type")   // e.g. "trial_not_started_1"
     sentAt    DateTime @default(now()) @map("sent_at")

     @@unique([userId, emailType])
     @@index([userId])
     @@map("sent_emails")
   }

   Run `prisma migrate dev --name add_sent_emails` (or provide the migration SQL if
   using raw migrations).

2. **Resend client** — Install the `resend` npm package in `packages/api`.
   Create `packages/api/src/lib/email.ts`:
   - Initialise a `Resend` client using `RESEND_API_KEY` from env.
   - Export a `sendEmail({ to, subject, html, text, emailType, userId })` function that:
     a. Checks `sent_emails` via Prisma — if a row exists for (userId, emailType), skip and
        return `{ skipped: true }`.
     b. Sends the email via Resend from `support@babblo.app`, reply-to `support@babblo.app`.
     c. On success, inserts a row into `sent_emails`.
     d. Returns `{ sent: true }` or `{ skipped: true }`.
   - Export email type constants as a const object:
     `EMAIL_TYPES = { TNS_1, TNS_2, TA_1, TA_2, TE_1 }` (trial_not_started_1, etc.)

3. Add `RESEND_API_KEY` to any `.env.example` file.

Do not create any templates or cron jobs yet.
```

---

### Prompt 9 — Email template system + translation build script

```
You are working in `packages/api`.

We need a template system for 5 lifecycle emails. Templates are written in English,
then pre-translated into 11 languages at build time using the Claude API.

The 11 languages (use ISO 639-1 codes as keys):
  en, es, fr, de, pt, it, nl, pl, ru, tr, ja

**Step 1 — Template structure**

Create `packages/api/src/email-templates/types.ts`:
  export interface EmailTemplate {
    emailType: string;
    subject: string;
    text: string;   // plain text body (use {{name}} and {{targetLanguage}} as placeholders)
  }

Create `packages/api/src/email-templates/en/` with 5 files, one per email.
Each file exports a single `EmailTemplate` object. Use the exact copy below.

`trial_not_started_1.ts`:
  subject: "Your first Babblo call is waiting"
  text: |
    Hi {{name}},

    You're all set to start practising {{targetLanguage}} with Babblo — you have 10 free
    minutes ready to go.

    Here's how to get started:
    1. Open Babblo
    2. Pick an AI conversation partner
    3. Hit call and start talking

    Your first call doesn't need to be perfect. Just start.

    Tim
    support@babblo.app

`trial_not_started_2.ts`:
  subject: "Quick question about Babblo"
  text: |
    Hi {{name}},

    You signed up for Babblo a few days ago but haven't made a call yet — I'd love to know why.

    Is something getting in the way? Just reply to this email and let me know. I read every
    response.

    As a thank you for your feedback, I'll add extra free minutes to your account.

    Tim
    support@babblo.app

`trial_active_1.ts`:
  subject: "Getting the most out of Babblo"
  text: |
    Hi {{name}},

    Hope your first call went well!

    A quick tip: calls work best when you pick a specific topic. Instead of just "have a
    conversation", try something like "help me practise ordering food at a restaurant" or
    "talk me through introducing myself at a job interview". The more specific the topic,
    the more useful the call.

    Also worth knowing: after every call, Babblo shows you the words and phrases you got
    wrong and how to say them properly. It's worth spending a minute reviewing these after
    each session.

    One more thing: you can earn extra free minutes by leaving a review on the App Store
    or Play Store, or by referring a friend. Head to the app settings to get started.

    Tim
    support@babblo.app

`trial_active_2.ts`:
  subject: "A quick question"
  text: |
    Hi {{name}},

    It looks like you haven't had a chance to use Babblo in a while. I'd love to hear
    what's not working for you.

    What would make Babblo more useful? Just reply to this email — I read everything.

    As a thank you, I'll add some extra free minutes to your account.

    Tim
    support@babblo.app

`trial_exhausted_1.ts`:
  subject: "You've used your free minutes — keep going"
  text: |
    Hi {{name}},

    You've used up your 10 free Babblo minutes — hope the calls were useful!

    Your first top-up comes with 50% extra minutes free, automatically applied at checkout.

    Open Babblo to top up your account.

    Tim
    support@babblo.app

**Step 2 — Translation build script**

Create `packages/api/src/email-templates/translate.ts` as a standalone script
(run with `ts-node` or `tsx`):

- Requires `ANTHROPIC_API_KEY` from env.
- Imports all 5 English templates.
- For each template × each non-English language:
  - Calls the Claude API (`claude-sonnet-4-6`) with a prompt asking it to translate the
    subject and body into the target language, preserving `{{name}}` and `{{targetLanguage}}`
    placeholders exactly, preserving the tone (warm, direct, signed "Tim"), and not
    translating the email address or app name "Babblo".
  - Writes the result to `packages/api/src/email-templates/<lang>/<emailType>.json`
    as `{ emailType, subject, text }`.
- Also writes the English source templates as JSON to `en/<emailType>.json` for consistency.
- Logs progress per file. Skips files that already exist (add `--force` flag to overwrite).

**Step 3 — Template loader**

Create `packages/api/src/email-templates/index.ts`:
- Exports `getTemplate(emailType: string, languageCode: string): EmailTemplate`
  - Loads from `<lang>/<emailType>.json`. Falls back to `en/` if the language file doesn't exist.
- Exports `renderTemplate(template: EmailTemplate, vars: { name: string, targetLanguage: string }): EmailTemplate`
  - Replaces `{{name}}` and `{{targetLanguage}}` in subject and text.
```

---

### Prompt 10 — Cron jobs

```
You are working in `packages/api`.

The following already exist:
- `babbloQuery` in `src/lib/babblo-db.ts` — runs queries against the Babblo DB
- `sendEmail` and `EMAIL_TYPES` in `src/lib/email.ts`
- `getTemplate` and `renderTemplate` in `src/email-templates/index.ts`
- The Babblo DB schema (profiles, user_balance, conversation_sessions, first_purchases, referrals)

Install `node-cron` and `@types/node-cron` in `packages/api`.

Create `packages/api/src/jobs/email-cron.ts` with the following:

**Helper: getUserEmail(userId)**
Query the Babblo DB for the user's Auth0-linked email address. The email is stored in
`profiles.email` (add this field to your understanding of the schema — it is present).

**Helper: getLifecycleStage(userId)**
Returns the lifecycle stage string for a user using the same CASE logic as the query functions.

**Job 1: trial_not_started_email_1**
- Runs daily at 09:00 UTC.
- Finds all Babblo users where:
  - lifecycleStage = trial_not_started
  - profiles.created_at is between 23 and 25 hours ago (i.e. ~day 1)
  - No row in sent_emails for (userId, 'trial_not_started_1')
- For each: get template for their native_language, render with name + targetLanguage, send.

**Job 2: trial_not_started_email_2**
- Runs daily at 09:00 UTC.
- Finds all Babblo users where:
  - lifecycleStage = trial_not_started
  - profiles.created_at is between 95 and 97 hours ago (~day 4)
  - No row in sent_emails for (userId, 'trial_not_started_2')
- Send trial_not_started_2 template.

**Job 3: trial_active_email_1**
- Runs daily at 09:00 UTC.
- Finds all Babblo users where:
  - lifecycleStage = trial_active
  - profiles.created_at is between 47 and 49 hours ago (~day 2)
  - No row in sent_emails for (userId, 'trial_active_1')
- Send trial_active_1 template.

**Job 4: trial_active_email_2**
- Runs daily at 09:00 UTC.
- Finds all Babblo users where:
  - lifecycleStage = trial_active
  - profiles.created_at is 7+ days ago
  - No call in the last 5 days (no conversation_sessions in last 5 days)
  - No row in sent_emails for (userId, 'trial_active_2')
- Send trial_active_2 template.

**Job 5: trial_exhausted_email_1**
- Runs daily at 09:00 UTC (also check for newly exhausted users — those who hit 0 today).
- Finds all Babblo users where:
  - balance_seconds = 0
  - No row in first_purchases
  - No row in sent_emails for (userId, 'trial_exhausted_1')
  - user_balance.updated_at (or last transaction) is within the last 48 hours
    (catch recent exhaustion without re-sending to old exhausted users on first deploy)
- Send trial_exhausted_1 template.

**Registration**
Create `packages/api/src/jobs/index.ts` that imports all jobs and starts them.
Call `startEmailJobs()` from `packages/api/src/index.ts` after the server starts.

Log all job activity: job name, number of users found, emails sent, emails skipped.
Wrap each job in a try/catch — a failing job must not crash the process.
```

---

### Prompt 11 — Babblo app: display_name (separate codebase)

```
This prompt is for the Babblo mobile app backend (separate from the Personal Assistant).
The Babblo backend is a Node.js/TypeScript API using PostgreSQL.

We need to store a display_name for each user, pulled from their Auth0 profile at signup.

Tasks:

1. **Database migration** — Add a nullable `display_name TEXT` column to the `profiles` table.
   Write a migration SQL file or use your existing migration framework.
   This column should NOT be included in the DO UPDATE SET clause of the profiles upsert
   (line ~1850 in the auth controller) — it should only be set on INSERT.

2. **Auth0 Management API call at signup** — When a new user is created (INSERT path of the
   profiles upsert), fetch their Auth0 profile using the Auth0 Management API:
   `GET https://<AUTH0_DOMAIN>/api/v2/users/<user_id>`
   Extract the `name` field (present for Google/Apple SSO users; may be undefined for
   email/password signups).

3. **Persist display_name** — Include `display_name` in the INSERT clause of the profiles
   upsert. Set it to the Auth0 `name` value if present, or NULL if not.

4. **Auth0 Management API credentials** — Add `AUTH0_DOMAIN`, `AUTH0_MGMT_CLIENT_ID`,
   and `AUTH0_MGMT_CLIENT_SECRET` to the environment. Fetch a Management API token using
   the client credentials flow (cache it in memory with expiry). Do not use the Auth0
   Node.js SDK — use plain fetch/https to keep dependencies minimal.

5. **Graceful fallback** — If the Auth0 Management API call fails (network error, rate limit),
   log a warning and proceed with display_name = NULL. Do not block signup.
```

---

## Deployment Note (Manual Step — No Prompt Needed)

Before any of the above code is deployed, update `render.yaml`:
- Add `region: frankfurt` to both `pa-api` and `pa-web` service definitions
- Add `BABBLO_DATABASE_URL` and `RESEND_API_KEY` to `pa-api` env vars (sync: false — set in dashboard)
- Add `ANTHROPIC_API_KEY` to `pa-api` env vars (used by translate script at build time)

Run the translation script as part of the API build command:
`... && npx tsx src/email-templates/translate.ts && pnpm --filter @pa/api build`
