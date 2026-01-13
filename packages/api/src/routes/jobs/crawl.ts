/**
 * Crawl Routes
 * Handles job crawling API endpoints
 */

import { Router } from 'express';
import { crawlController } from '../../controllers/crawl.js';
import { apiKeyAuth, asyncHandler } from '../../middleware/index.js';

const router = Router();

// All routes require authentication
router.use(apiKeyAuth);

// POST /jobs/crawl/all - Crawl all active companies
router.post('/all', asyncHandler(crawlController.crawlAll));

// POST /jobs/crawl/:companyId - Crawl a specific company
router.post('/:companyId', asyncHandler(crawlController.crawlCompany));

// POST /jobs/crawl/:companyId/results - Submit crawl results from external crawler
router.post('/:companyId/results', asyncHandler(crawlController.submitCrawlResults));

// POST /jobs/recalculate-scores - Recalculate match scores
router.post('/recalculate-scores', asyncHandler(crawlController.recalculateScores));

// GET /jobs/crawl-logs - Get crawl history
router.get('/logs', asyncHandler(crawlController.getCrawlLogs));

export { router as crawlRouter };
