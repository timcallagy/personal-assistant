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
