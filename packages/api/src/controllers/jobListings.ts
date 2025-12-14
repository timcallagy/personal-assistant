/**
 * Job Listings Controller
 * Handles discovered job listing operations
 */

import { Request, Response } from 'express';
import * as jobListingService from '../services/jobListingService.js';
import { notFoundError, validationError } from '../lib/errors.js';
import { JOB_STATUS, type JobStatus } from '@pa/shared';

const validStatuses = Object.values(JOB_STATUS);

export const jobListingsController = {
  /**
   * List job listings with filtering
   * GET /jobs/listings
   */
  list: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    // Parse query parameters
    const companyIdParam = req.query['companyId'] as string | undefined;
    const statusParam = req.query['status'] as string | undefined;
    const minScoreParam = req.query['minScore'] as string | undefined;
    const limitParam = req.query['limit'] as string | undefined;
    const offsetParam = req.query['offset'] as string | undefined;

    const companyId = companyIdParam ? parseInt(companyIdParam, 10) : undefined;
    const status = statusParam as JobStatus | undefined;
    const minScore = minScoreParam ? parseFloat(minScoreParam) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    // Validate status if provided
    if (status && !validStatuses.includes(status)) {
      throw validationError('Invalid status', { status: `Must be one of: ${validStatuses.join(', ')}` });
    }

    const { listings, total } = await jobListingService.getJobListings(userId, {
      companyId,
      status,
      minScore,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: {
        listings,
        total,
        limit,
        offset,
      },
    });
  },

  /**
   * Get a single job listing
   * GET /jobs/listings/:id
   */
  get: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const idParam = req.params['id'] ?? '';
    const listingId = parseInt(idParam, 10);

    if (isNaN(listingId)) {
      throw notFoundError('Job listing', idParam);
    }

    const listing = await jobListingService.getJobListing(userId, listingId);

    if (!listing) {
      throw notFoundError('Job listing', String(listingId));
    }

    res.json({
      success: true,
      data: { listing },
    });
  },

  /**
   * Update job listing status
   * PUT /jobs/listings/:id/status
   */
  updateStatus: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const idParam = req.params['id'] ?? '';
    const listingId = parseInt(idParam, 10);
    const { status } = req.body;

    if (isNaN(listingId)) {
      throw notFoundError('Job listing', idParam);
    }

    // Validate status
    if (!status) {
      throw validationError('Status is required', { status: 'Required field' });
    }

    if (!validStatuses.includes(status)) {
      throw validationError('Invalid status', { status: `Must be one of: ${validStatuses.join(', ')}` });
    }

    const listing = await jobListingService.updateJobStatus(userId, listingId, status);

    if (!listing) {
      throw notFoundError('Job listing', String(listingId));
    }

    res.json({
      success: true,
      data: { listing },
    });
  },

  /**
   * Batch update job statuses
   * PUT /jobs/listings/batch-status
   */
  batchUpdateStatus: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { ids, status } = req.body;

    // Validate inputs
    if (!Array.isArray(ids) || ids.length === 0) {
      throw validationError('Invalid ids', { ids: 'Must be a non-empty array of job listing IDs' });
    }

    if (!status || !validStatuses.includes(status)) {
      throw validationError('Invalid status', { status: `Must be one of: ${validStatuses.join(', ')}` });
    }

    const listingIds = ids.map((id: unknown) => parseInt(String(id), 10)).filter((id: number) => !isNaN(id));

    if (listingIds.length === 0) {
      throw validationError('Invalid ids', { ids: 'No valid IDs provided' });
    }

    const updated = await jobListingService.batchUpdateJobStatus(userId, listingIds, status);

    res.json({
      success: true,
      data: { updated },
      message: `Updated ${updated} job listings`,
    });
  },

  /**
   * Get job statistics
   * GET /jobs/stats
   */
  getStats: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const stats = await jobListingService.getJobStats(userId);

    res.json({
      success: true,
      data: { stats },
    });
  },
};
