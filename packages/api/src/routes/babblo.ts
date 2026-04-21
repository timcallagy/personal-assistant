import { Router } from 'express';
import { sessionAuth } from '../middleware/index.js';
import { babbloController } from '../controllers/babblo.js';
import { asyncHandler } from '../middleware/index.js';
import { EMAIL_JOBS } from '../jobs/email-cron.js';
import { prisma } from '../lib/index.js';
import { createCache } from '../lib/simpleCache.js';
import * as posthog from '../services/posthog.js';
import { getAdMetrics } from '../services/googleAds.js';
import type { FunnelStep, FunnelConfigResponse, FunnelFilterOptions, FunnelEventsResponse, FunnelResponse } from '@pa/shared';

export const babbloRouter = Router();

babbloRouter.use(sessionAuth);

// ─── Funnel Config ────────────────────────────────────────────────────────────

const DEFAULT_FUNNEL_STEPS: FunnelStep[] = [
  { event: 'impressions', visible: true },
  { event: 'clicks', visible: true },
  { event: 'installs', visible: true },
  { event: 'App Opened', visible: true },
  { event: 'Onboarding Started', visible: true },
  { event: 'Target Language Selected', visible: true },
  { event: 'Onboarding Topics Viewed', visible: true },
  { event: 'Onboarding Topic Selected', visible: true },
  { event: 'Sign Up Attempted', visible: true },
  { event: 'Login Attempted', visible: true },
  { event: 'call_started', visible: true },
];

babbloRouter.get('/funnel-config', asyncHandler(async (req, res) => {
  const config = await prisma.babbloFunnelConfig.findUnique({
    where: { userId: req.user!.id },
  });
  const steps: FunnelStep[] = config
    ? (config.steps as unknown as FunnelStep[])
    : DEFAULT_FUNNEL_STEPS;
  const response: FunnelConfigResponse = { steps };
  res.json({ success: true, data: response });
}));

babbloRouter.post('/funnel-config', asyncHandler(async (req, res) => {
  const { steps } = req.body as { steps?: unknown };
  if (!Array.isArray(steps) || steps.length === 0) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'steps must be a non-empty array' } });
    return;
  }
  for (const s of steps) {
    if (typeof (s as FunnelStep).event !== 'string' || typeof (s as FunnelStep).visible !== 'boolean') {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Each step must have event (string) and visible (boolean)' } });
      return;
    }
  }
  const saved = await prisma.babbloFunnelConfig.upsert({
    where: { userId: req.user!.id },
    create: { userId: req.user!.id, steps },
    update: { steps },
  });
  const response: FunnelConfigResponse = { steps: saved.steps as unknown as FunnelStep[] };
  res.json({ success: true, data: response });
}));

// ─── Funnel Meta (events + filter options) ────────────────────────────────────

const FIVE_MIN = 5 * 60 * 1000;
const eventsCache = createCache<FunnelEventsResponse>(FIVE_MIN);
const filterOptionsCache = createCache<FunnelFilterOptions>(FIVE_MIN);

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

babbloRouter.get('/funnel-events', asyncHandler(async (_req, res) => {
  const cached = eventsCache.get('all');
  if (cached) { res.json({ success: true, data: cached }); return; }
  const events = await withTimeout(posthog.getDistinctEvents(), 15000, []);
  const response: FunnelEventsResponse = { events };
  if (events.length > 0) eventsCache.set('all', response);
  res.json({ success: true, data: response });
}));

babbloRouter.get('/funnel-filter-options', asyncHandler(async (_req, res) => {
  const cached = filterOptionsCache.get('all');
  if (cached) { res.json({ success: true, data: cached }); return; }
  const [versions, countries] = await withTimeout(
    Promise.all([posthog.getDistinctVersions(), posthog.getDistinctCountries()]),
    15000,
    [[], []] as [string[], string[]]
  );
  const response: FunnelFilterOptions = { versions, countries };
  // Only cache if we got real data — empty results from a timeout should not be cached
  if (versions.length > 0 || countries.length > 0) {
    filterOptionsCache.set('all', response);
  }
  res.json({ success: true, data: response });
}));

// ─── Funnel Data ──────────────────────────────────────────────────────────────

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

babbloRouter.get('/funnel', asyncHandler(async (req, res) => {
  const { from, to, versions, countries, steps: stepsParam } = req.query as Record<string, string | undefined>;

  if (!from || !isValidDate(from)) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'from must be a valid YYYY-MM-DD date' } });
    return;
  }
  if (!to || !isValidDate(to)) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'to must be a valid YYYY-MM-DD date' } });
    return;
  }
  if (!stepsParam || stepsParam.trim() === '') {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'steps is required' } });
    return;
  }
  if (new Date(from) > new Date(to)) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'from must be before or equal to to' } });
    return;
  }

  const selectedVersions = versions ? versions.split(',').filter(Boolean) : [];
  const selectedCountries = countries ? countries.split(',').filter(Boolean) : [];
  const allSteps = stepsParam.split(',').filter(Boolean);
  const posthogSteps = allSteps.filter((s) => !['installs', 'clicks', 'impressions'].includes(s));
  const multiVersion = selectedVersions.length >= 2;

  const TIMEOUT_MS = 15000;

  try {
    const fetchAll = async () => {
      const geoFilter = selectedCountries.length ? selectedCountries : undefined;
      const versionFilter = selectedVersions.length ? selectedVersions : undefined;

      const promises: Promise<unknown>[] = [getAdMetrics(from, to)];
      if (multiVersion) {
        promises.push(posthog.getFunnelCounts(from, to, posthogSteps, undefined, geoFilter));
        for (const v of selectedVersions) {
          promises.push(posthog.getFunnelCounts(from, to, posthogSteps, [v], geoFilter));
        }
      } else {
        promises.push(posthog.getFunnelCounts(from, to, posthogSteps, versionFilter, geoFilter));
      }

      const results = await Promise.all(promises);
      const { installs, clicks, impressions } = results[0] as { installs: number | null; clicks: number | null; impressions: number | null };
      const combinedCounts = results[1] as Record<string, number>;
      const perVersionCounts: Record<string, Record<string, number>> = {};
      if (multiVersion) {
        selectedVersions.forEach((v, i) => { perVersionCounts[v] = results[i + 2] as Record<string, number>; });
      }

      const steps: FunnelResponse['steps'] = posthogSteps.map((event) => {
        if (multiVersion) {
          const versionMap: Record<string, number> = {};
          selectedVersions.forEach((v) => { versionMap[v] = perVersionCounts[v]?.[event] ?? 0; });
          return { event, all: combinedCounts[event] ?? 0, versions: versionMap };
        }
        return { event, all: combinedCounts[event] ?? 0 };
      });

      return { installs, clicks, impressions, steps };
    };

    const result = await Promise.race([
      fetchAll(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS)),
    ]);

    const response: FunnelResponse = { impressions: result.impressions, clicks: result.clicks, installs: result.installs, steps: result.steps, dateFrom: from, dateTo: to };
    res.json({ success: true, data: response });
  } catch (err) {
    if ((err as Error).message === 'TIMEOUT') {
      res.status(504).json({ success: false, error: { code: 'TIMEOUT', message: 'Request timed out. Try a shorter date range.' } });
      return;
    }
    console.error('[Funnel] Error:', err);
    res.status(500).json({ success: false, error: { code: 'POSTHOG_ERROR', message: 'Could not load funnel data from PostHog.' } });
  }
}));

// Stats must come before /:id to avoid being captured as a user ID
babbloRouter.get('/stats', asyncHandler(babbloController.getStats));
babbloRouter.get('/', asyncHandler(babbloController.listUsers));
babbloRouter.get('/:id/calls/:sessionId', asyncHandler(babbloController.getCallTranscript));
babbloRouter.get('/:id', asyncHandler(babbloController.getUserProfile));

babbloRouter.post('/email-jobs/:jobName/run', asyncHandler(async (req, res) => {
  const { jobName } = req.params as { jobName: string };
  const job = EMAIL_JOBS[jobName];
  if (!job) {
    res.status(404).json({ success: false, error: `Unknown job: ${jobName}. Available: ${Object.keys(EMAIL_JOBS).join(', ')}` });
    return;
  }
  await job();
  res.json({ success: true, message: `Job ${jobName} completed.` });
}));

// Test endpoint — sends a single email to a specified address, bypasses eligibility/dedup
babbloRouter.post('/email-jobs/:jobName/test', asyncHandler(async (req, res) => {
  const { jobName } = req.params as { jobName: string };
  const { email } = req.body as { email?: string };

  if (!email) {
    res.status(400).json({ success: false, error: 'Provide { "email": "..." } in the request body.' });
    return;
  }

  const emailTypeMap: Record<string, string> = {
    email_not_verified_1: 'email_not_verified_1',
    trial_not_started_1: 'trial_not_started_1',
    trial_not_started_2: 'trial_not_started_2',
    trial_active_1: 'trial_active_1',
    trial_active_2: 'trial_active_2',
    trial_exhausted_1: 'trial_exhausted_1',
  };

  const emailType = emailTypeMap[jobName];
  if (!emailType) {
    res.status(404).json({ success: false, error: `Unknown job: ${jobName}` });
    return;
  }

  const { language } = req.body as { email?: string; language?: string };

  const { getTemplate, renderTemplate } = await import('../email-templates/index.js');
  const { generateUnsubscribeToken } = await import('../lib/unsubscribe-token.js');
  const { sendEmail } = await import('../lib/email.js');

  const API_PUBLIC_URL = process.env['API_PUBLIC_URL'] ?? 'https://pa-api-2fwl.onrender.com';
  const template = getTemplate(emailType, language ?? 'en');
  const token = generateUnsubscribeToken('test-user');
  const rendered = renderTemplate(template, {
    name: 'Test User',
    targetLanguage: 'es',
    emailLanguage: language ?? 'en',
    unsubscribeLink: `${API_PUBLIC_URL}/api/v1/unsubscribe?token=${token}`,
  });

  const result = await sendEmail({
    to: email,
    subject: `[TEST] ${rendered.subject}`,
    text: rendered.text,
    html: rendered.html,
    emailType: emailType as import('../lib/email.js').EmailType,
    userId: 'test-user',
  });

  if (result.skipped) {
    res.json({ success: true, data: { message: `Skipped — user is unsubscribed or email already sent.` } });
  } else {
    res.json({ success: true, data: { message: `Test email sent to ${email}` } });
  }
}));
