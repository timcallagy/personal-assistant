/**
 * Job Listings Routes
 * Handles discovered job listing API endpoints
 */

import { Router } from 'express';
import { jobListingsController } from '../../controllers/jobListings.js';
import { apiKeyAuth, asyncHandler } from '../../middleware/index.js';

const router = Router();

// All routes require authentication
router.use(apiKeyAuth);

// GET /jobs/listings - List job listings
router.get('/', asyncHandler(jobListingsController.list));

// GET /jobs/listings/stats - Get job statistics
router.get('/stats', asyncHandler(jobListingsController.getStats));

// PUT /jobs/listings/batch-status - Batch update statuses
router.put('/batch-status', asyncHandler(jobListingsController.batchUpdateStatus));

// GET /jobs/listings/:id - Get a single job listing
router.get('/:id', asyncHandler(jobListingsController.get));

// GET /jobs/listings/:id/score-breakdown - Get score breakdown
router.get('/:id/score-breakdown', asyncHandler(jobListingsController.getScoreBreakdown));

// PUT /jobs/listings/:id/status - Update job status
router.put('/:id/status', asyncHandler(jobListingsController.updateStatus));

export { router as listingsRouter };
