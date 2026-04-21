# Babblo User CMS + Lifecycle Email Automation — Spec

## 1. CMS Overview

### Location
Built within the existing Personal Assistant web app.

### Auth
Username/password login, credentials stored in the PA database.

### Infrastructure
The Personal Assistant must be migrated from Render Oregon to Render Frankfurt to co-locate with the Babblo database (Frankfurt, EU region). This is a prerequisite for all DB queries.

### Access model
Read-only. No manual actions from the interface. The only manual action is Tim adding free minutes directly in the Babblo DB when a user responds to a survey.

---

## 2. User List Page

### Summary stats (top of page)
Counts by lifecycle stage:

| Stage | Count |
|---|---|
| trial_not_started | N |
| trial_active | N |
| trial_exhausted | N |
| purchased | N |

### User list columns

| Column | Source |
|---|---|
| User ID | profiles.id |
| Created at | profiles.created_at |
| Lifecycle stage | derived (see section 4) |
| Bonus requested | derived (see section 4) |
| Calls made | COUNT(conversation_sessions) |
| Free minutes given | user_balance: initial grant + bonus |
| Minutes purchased | SUM(transactions where type=purchase) |
| Minutes used | derived from balance history |
| Minutes remaining | user_balance.balance_seconds / 60 |

---

## 3. User Profile Detail Page

- **Call history:** date, duration, language, AI persona, corrections
- **Persona memory:** persona_rolling_memory data per persona
- **Cost:** total cost in USD (from token_usage.cost_usd)
- **Revenue:** total revenue from transactions
- **Transaction history:** full list with date, type, amount

---

## 4. Lifecycle Stage Definitions

Derived from `user_balance.balance_seconds` and `first_purchases`:

| Stage | Condition |
|---|---|
| `trial_not_started` | balance_seconds = 600 (never used any minutes) |
| `trial_active` | balance_seconds between 1–599 |
| `trial_exhausted` | balance_seconds = 0, no row in first_purchases |
| `purchased` | row exists in first_purchases |

### Bonus requested label (orthogonal to stage)
A user has `bonus_requested = true` if:
- `app_review_bonus_used = true` in their profile, OR
- They appear as a referrer in the `referrals` table

---

## 5. Email Automation

### Infrastructure
- **Delivery:** Resend, from `support@babblo.app`, signed "Tim"
- **Reply-to:** `support@babblo.app` (for survey emails — Tim reads and responds manually)
- **Scheduling:** Daily batch cron jobs
- **Translations:** Pre-translated into all 11 supported app languages using Claude API at template build time. Template is sent in the user's native language.
- **Personalisation:** `display_name` pulled from Auth0 at signup and stored in `profiles.display_name`. Used as the greeting name in emails. Falls back to "Hi," (no name) when unavailable.

### Deduplication
The cron job must track which emails have been sent to each user. Do not send the same email twice to the same user.

---

## 6. Email Sequences

### 6.1 trial_not_started

**Email 1 — Day 1 after signup**

> Subject: Your first Babblo call is waiting
>
> Hi [name],
>
> You're all set to start practising [target language] with Babblo — you have 10 free minutes ready to go.
>
> Here's how to get started:
> 1. Open Babblo
> 2. Pick an AI conversation partner
> 3. Hit call and start talking
>
> Your first call doesn't need to be perfect. Just start.
>
> Tim
> support@babblo.app

---

**Email 2 — Day 4 (if still trial_not_started)**

> Subject: Quick question about Babblo
>
> Hi [name],
>
> You signed up for Babblo a few days ago but haven't made a call yet — I'd love to know why.
>
> Is something getting in the way? Just reply to this email and let me know. I read every response.
>
> As a thank you for your feedback, I'll add extra free minutes to your account.
>
> Tim
> support@babblo.app

---

### 6.2 trial_active

**Email 1 — Day 2 after signup**

> Subject: Getting the most out of Babblo
>
> Hi [name],
>
> Hope your first call went well!
>
> A quick tip: calls work best when you pick a specific topic. Instead of just "have a conversation", try something like "help me practise ordering food at a restaurant" or "talk me through introducing myself at a job interview". The more specific the topic, the more useful the call.
>
> Also worth knowing: after every call, Babblo shows you the words and phrases you got wrong and how to say them properly. It's worth spending a minute reviewing these after each session.
>
> One more thing: you can earn extra free minutes by leaving a review on the App Store or Play Store, or by referring a friend. Head to the app settings to get started.
>
> Tim
> support@babblo.app

---

**Email 2 — Day 7 (if still trial_active and no call in the last 5 days)**

> Subject: A quick question
>
> Hi [name],
>
> It looks like you haven't had a chance to use Babblo in a while. I'd love to hear what's not working for you.
>
> What would make Babblo more useful? Just reply to this email — I read everything.
>
> As a thank you, I'll add some extra free minutes to your account.
>
> Tim
> support@babblo.app

---

### 6.3 trial_exhausted

**Email 1 — Day 0 (when trial hits 0 minutes)**

> Subject: You've used your free minutes — keep going
>
> Hi [name],
>
> You've used up your 10 free Babblo minutes — hope the calls were useful!
>
> Your first top-up comes with 50% extra minutes free, automatically applied at checkout.
>
> [Top up your minutes →] *(deep link to payments page)*
>
> Tim
> support@babblo.app

---

### 6.4 purchased
No automated emails at this stage.

---

## 7. Implementation Notes

- **Deep links:** The trial_exhausted email CTA uses a deep link to open the app directly to the payments page. Deep links to be added to the Babblo app.
- **display_name:** Pull from Auth0 user profile at signup (available for Google/Apple SSO users). Store in `profiles.display_name`. Emails fall back to "Hi," when field is empty.
- **Translations:** All email templates are pre-translated at build time using the Claude API — one file per email per language (11 languages). No per-send translation.
- **Pricing:** Not included in emails. Pricing is shown in the app on the payments page.
- **Free minutes rewards:** Fulfilled manually by Tim in the Babblo DB when a user replies to a survey email.
- **Cron deduplication:** A sent_emails log table (or equivalent) must track (user_id, email_type) pairs to prevent duplicate sends.
