/**
 * Crawl Controller
 * Handles job crawling operations
 */

import { Request, Response } from 'express';
import * as crawlingService from '../services/crawlingService.js';
import { notFoundError } from '../lib/errors.js';

export const crawlController = {
  /**
   * Trigger crawl for a single company
   * POST /jobs/crawl/:companyId
   */
  crawlCompany: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const companyIdParam = req.params['companyId'] ?? '';
    const companyId = parseInt(companyIdParam, 10);

    if (isNaN(companyId)) {
      throw notFoundError('Company', companyIdParam || 'unknown');
    }

    const result = await crawlingService.crawlCompany(userId, companyId);

    res.json({
      success: true,
      data: { result },
    });
  },

  /**
   * Trigger crawl for all active companies
   * POST /jobs/crawl/all
   * Body: { apiOnly?: boolean } - If true, only crawl API-based ATS (greenhouse, lever, ashby)
   */
  crawlAll: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const apiOnly = req.body?.apiOnly === true;

    const { results, totalJobsFound, newJobsFound, skippedCompanyIds } =
      await crawlingService.crawlAllCompanies(userId, apiOnly);

    res.json({
      success: true,
      data: {
        companiesCrawled: results.length,
        totalJobsFound,
        newJobsFound,
        results,
        skippedCompanyIds,
      },
    });
  },

  /**
   * Get crawl logs
   * GET /jobs/crawl-logs
   */
  getCrawlLogs: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const companyIdParam = req.query['companyId'] as string | undefined;
    const limitParam = req.query['limit'] as string | undefined;
    const companyId = companyIdParam ? parseInt(companyIdParam, 10) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    const logs = await crawlingService.getCrawlLogs(userId, companyId, limit);

    res.json({
      success: true,
      data: {
        logs,
        total: logs.length,
      },
    });
  },

  /**
   * Recalculate match scores for all jobs
   * POST /jobs/recalculate-scores
   */
  recalculateScores: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const updated = await crawlingService.recalculateMatchScores(userId);

    res.json({
      success: true,
      data: { updated },
      message: `Recalculated match scores for ${updated} jobs`,
    });
  },
};
