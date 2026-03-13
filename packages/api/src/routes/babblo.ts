import { Router } from 'express';
import { sessionAuth } from '../middleware/index.js';
import { babbloController } from '../controllers/babblo.js';
import { asyncHandler } from '../middleware/index.js';
import { EMAIL_JOBS } from '../jobs/email-cron.js';

export const babbloRouter = Router();

babbloRouter.use(sessionAuth);

// Stats must come before /:id to avoid being captured as a user ID
babbloRouter.get('/stats', asyncHandler(babbloController.getStats));
babbloRouter.get('/', asyncHandler(babbloController.listUsers));
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

  const { getTemplate, renderTemplate } = await import('../email-templates/index.js');
  const { generateUnsubscribeToken } = await import('../lib/unsubscribe-token.js');
  const { Resend } = await import('resend');

  const API_PUBLIC_URL = process.env['API_PUBLIC_URL'] ?? 'https://pa-api-2fwl.onrender.com';
  const template = getTemplate(emailType, 'en');
  const token = generateUnsubscribeToken('test-user');
  const rendered = renderTemplate(template, {
    name: 'Test User',
    targetLanguage: 'Spanish',
    unsubscribeLink: `${API_PUBLIC_URL}/api/v1/unsubscribe?token=${token}`,
  });

  const resend = new Resend(process.env['RESEND_API_KEY']);
  await resend.emails.send({
    from: 'Tim <support@babblo.app>',
    to: email,
    subject: `[TEST] ${rendered.subject}`,
    text: rendered.text,
    ...(rendered.html && { html: rendered.html }),
  });

  res.json({ success: true, message: `Test email sent to ${email}` });
}));
