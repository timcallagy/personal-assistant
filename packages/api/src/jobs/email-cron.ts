import cron from 'node-cron';
import { babbloQuery } from '../lib/babblo-db.js';
import { sendEmail, EMAIL_TYPES } from '../lib/email.js';
import { getTemplate, renderTemplate } from '../email-templates/index.js';
import { generateUnsubscribeToken } from '../lib/unsubscribe-token.js';
import { prisma } from '../lib/index.js';

const API_PUBLIC_URL = process.env['API_PUBLIC_URL'] ?? 'https://pa-api-2fwl.onrender.com';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EligibleUser {
  userId: string;
  email: string;
  displayName: string | null;
  appLanguage: string | null;
  targetLanguage: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDisplayName(user: EligibleUser): string {
  return user.displayName ?? '';
}

function getTargetLanguage(user: EligibleUser): string {
  return user.targetLanguage ?? 'your target language';
}

async function sendToUsers(
  users: EligibleUser[],
  emailType: (typeof EMAIL_TYPES)[keyof typeof EMAIL_TYPES],
  jobName: string
): Promise<void> {
  console.log(`[${jobName}] Found ${users.length} eligible user(s)`);
  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      const lang = user.appLanguage ?? 'en';
      const template = getTemplate(emailType, lang);
      const token = generateUnsubscribeToken(user.userId);
      const unsubscribeLink = `${API_PUBLIC_URL}/api/v1/unsubscribe?token=${token}`;
      const rendered = renderTemplate(template, {
        name: getDisplayName(user),
        targetLanguage: getTargetLanguage(user),
        unsubscribeLink,
      });
      const result = await sendEmail({
        to: user.email,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        emailType,
        userId: user.userId,
      });
      if (result.sent) sent++;
      if (result.skipped) skipped++;
    } catch (err) {
      console.error(`[${jobName}] Error sending to user ${user.userId}:`, err);
    }
  }

  console.log(`[${jobName}] Sent: ${sent}, Skipped: ${skipped}`);
}

// ─── Job 0: email_not_verified email 1 (day 1) ───────────────────────────────

async function runEmailNotVerified1(): Promise<void> {
  const jobName = 'email_not_verified_email_1';
  const users = await babbloQuery<EligibleUser>(`
    SELECT
      p.user_id                       AS "userId",
      p.info->>'email'                AS "email",
      p.info->>'display_name'         AS "displayName",
      p.info->>'app_language'          AS "appLanguage",
      p.info->>'target_language'      AS "targetLanguage"
    FROM profiles p
    INNER JOIN user_balance ub ON ub.user_id = p.user_id
    WHERE
      ub.free_trial_used = false
      AND ub.balance_seconds = 0
      AND p.created_at BETWEEN NOW() - INTERVAL '25 hours' AND NOW() - INTERVAL '23 hours'
      AND p.info->>'email' IS NOT NULL
  `);
  await sendToUsers(users, EMAIL_TYPES.ENV_1, jobName);
}

// ─── Job 1: trial_not_started email 1 (day 1) ────────────────────────────────

async function runTrialNotStarted1(): Promise<void> {
  const jobName = 'trial_not_started_email_1';
  const users = await babbloQuery<EligibleUser>(`
    SELECT
      p.user_id                       AS "userId",
      p.info->>'email'                AS "email",
      p.info->>'display_name'         AS "displayName",
      p.info->>'app_language'          AS "appLanguage",
      p.info->>'target_language'      AS "targetLanguage"
    FROM profiles p
    LEFT JOIN user_balance ub ON ub.user_id = p.user_id
    WHERE
      -- trial_not_started: balance untouched
      (ub.balance_seconds IS NULL OR ub.balance_seconds = 600)
      -- created ~1 day ago (23–25 hour window)
      AND p.created_at BETWEEN NOW() - INTERVAL '25 hours' AND NOW() - INTERVAL '23 hours'
      AND p.info->>'email' IS NOT NULL
  `);
  await sendToUsers(users, EMAIL_TYPES.TNS_1, jobName);
}

// ─── Job 2: trial_not_started email 2 (day 4) ────────────────────────────────

async function runTrialNotStarted2(): Promise<void> {
  const jobName = 'trial_not_started_email_2';
  const users = await babbloQuery<EligibleUser>(`
    SELECT
      p.user_id                       AS "userId",
      p.info->>'email'                AS "email",
      p.info->>'display_name'         AS "displayName",
      p.info->>'app_language'          AS "appLanguage",
      p.info->>'target_language'      AS "targetLanguage"
    FROM profiles p
    LEFT JOIN user_balance ub ON ub.user_id = p.user_id
    WHERE
      (ub.balance_seconds IS NULL OR ub.balance_seconds = 600)
      AND p.created_at BETWEEN NOW() - INTERVAL '97 hours' AND NOW() - INTERVAL '95 hours'
      AND p.info->>'email' IS NOT NULL
  `);
  await sendToUsers(users, EMAIL_TYPES.TNS_2, jobName);
}

// ─── Job 3: trial_active email 1 (day 2) ─────────────────────────────────────

async function runTrialActive1(): Promise<void> {
  const jobName = 'trial_active_email_1';
  const users = await babbloQuery<EligibleUser>(`
    SELECT
      p.user_id                       AS "userId",
      p.info->>'email'                AS "email",
      p.info->>'display_name'         AS "displayName",
      p.info->>'app_language'          AS "appLanguage",
      p.info->>'target_language'      AS "targetLanguage"
    FROM profiles p
    INNER JOIN user_balance ub ON ub.user_id = p.user_id
    WHERE
      ub.balance_seconds BETWEEN 1 AND 599
      AND p.created_at BETWEEN NOW() - INTERVAL '49 hours' AND NOW() - INTERVAL '47 hours'
      AND p.info->>'email' IS NOT NULL
  `);
  await sendToUsers(users, EMAIL_TYPES.TA_1, jobName);
}

// ─── Job 4: trial_active email 2 (day 7+, inactive 5+ days) ─────────────────

async function runTrialActive2(): Promise<void> {
  const jobName = 'trial_active_email_2';
  const users = await babbloQuery<EligibleUser>(`
    SELECT
      p.user_id                       AS "userId",
      p.info->>'email'                AS "email",
      p.info->>'display_name'         AS "displayName",
      p.info->>'app_language'          AS "appLanguage",
      p.info->>'target_language'      AS "targetLanguage"
    FROM profiles p
    INNER JOIN user_balance ub ON ub.user_id = p.user_id
    WHERE
      ub.balance_seconds BETWEEN 1 AND 599
      -- signed up at least 7 days ago
      AND p.created_at < NOW() - INTERVAL '7 days'
      -- no call in the last 5 days
      AND NOT EXISTS (
        SELECT 1 FROM conversation_sessions cs
        WHERE cs.user_id = p.user_id
          AND cs.started_at > NOW() - INTERVAL '5 days'
      )
      AND p.info->>'email' IS NOT NULL
  `);
  await sendToUsers(users, EMAIL_TYPES.TA_2, jobName);
}

// ─── Job 5: trial_exhausted email 1 (balance=0, recently exhausted) ──────────

async function runTrialExhausted1(): Promise<void> {
  const jobName = 'trial_exhausted_email_1';
  const users = await babbloQuery<EligibleUser>(`
    SELECT
      p.user_id                       AS "userId",
      p.info->>'email'                AS "email",
      p.info->>'display_name'         AS "displayName",
      p.info->>'app_language'          AS "appLanguage",
      p.info->>'target_language'      AS "targetLanguage"
    FROM profiles p
    INNER JOIN user_balance ub ON ub.user_id = p.user_id
    WHERE
      ub.balance_seconds = 0
      -- no purchase yet
      AND NOT EXISTS (SELECT 1 FROM first_purchases fp WHERE fp.user_id = p.user_id)
      -- exhausted within the last 48 hours (use last transaction as proxy)
      AND EXISTS (
        SELECT 1 FROM transactions t
        WHERE t.user_id = p.user_id
          AND t.created_at > NOW() - INTERVAL '48 hours'
      )
      AND p.info->>'email' IS NOT NULL
  `);
  await sendToUsers(users, EMAIL_TYPES.TE_1, jobName);
}

// ─── Exports for manual triggering ───────────────────────────────────────────

export const EMAIL_JOBS: Record<string, () => Promise<void>> = {
  email_not_verified_1: runEmailNotVerified1,
  trial_not_started_1: runTrialNotStarted1,
  trial_not_started_2: runTrialNotStarted2,
  trial_active_1: runTrialActive1,
  trial_active_2: runTrialActive2,
  trial_exhausted_1: runTrialExhausted1,
};

// ─── Scheduler ────────────────────────────────────────────────────────────────

export function startEmailJobs(): void {
  // All jobs run daily at 09:00 UTC
  const schedule = '0 9 * * *';

  const jobs = [
    { name: 'trial_not_started_email_1', fn: runTrialNotStarted1 },
    { name: 'trial_not_started_email_2', fn: runTrialNotStarted2 },
    { name: 'trial_active_email_1', fn: runTrialActive1 },
    { name: 'trial_active_email_2', fn: runTrialActive2 },
    { name: 'trial_exhausted_email_1', fn: runTrialExhausted1 },
  ];

  for (const job of jobs) {
    cron.schedule(schedule, async () => {
      const flag = await prisma.appConfig.findUnique({ where: { key: 'email_jobs_enabled' } });
      if (flag?.value !== 'true') {
        console.log(`[cron] Skipping ${job.name} — email_jobs_enabled is not true`);
        return;
      }
      console.log(`[cron] Starting job: ${job.name}`);
      try {
        await job.fn();
      } catch (err) {
        console.error(`[cron] Job failed: ${job.name}`, err);
      }
    });
    console.log(`[cron] Scheduled: ${job.name} at ${schedule}`);
  }
}
