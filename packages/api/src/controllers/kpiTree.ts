/**
 * KPI Tree Controller
 * Handles KPI tree API requests
 */

import { Request, Response } from 'express';
import * as kpiTreeService from '../services/kpiTreeService.js';
import { validationError } from '../lib/errors.js';

export const kpiTreeController = {
  /**
   * GET /kpi-tree/periods
   * List all periods
   */
  listPeriods: async (_req: Request, res: Response): Promise<void> => {
    const periods = await kpiTreeService.getPeriods();

    res.json({
      success: true,
      data: { periods },
    });
  },

  /**
   * GET /kpi-tree/periods/current
   * Get the current period
   */
  getCurrentPeriod: async (_req: Request, res: Response): Promise<void> => {
    const period = await kpiTreeService.getCurrentPeriod();

    res.json({
      success: true,
      data: { period },
    });
  },

  /**
   * GET /kpi-tree/periods/:id
   * Get a single period by ID
   */
  getPeriod: async (req: Request, res: Response): Promise<void> => {
    const periodId = parseInt(req.params['id']!, 10);

    if (isNaN(periodId)) {
      throw validationError('Invalid period ID');
    }

    const period = await kpiTreeService.getPeriod(periodId);

    res.json({
      success: true,
      data: { period },
    });
  },

  /**
   * GET /kpi-tree/metrics?periodId=X
   * Get all metrics with values for a specific period
   */
  getMetrics: async (req: Request, res: Response): Promise<void> => {
    const periodIdStr = req.query['periodId'] as string | undefined;

    if (!periodIdStr) {
      throw validationError('periodId is required');
    }

    const periodId = parseInt(periodIdStr, 10);
    if (isNaN(periodId)) {
      throw validationError('Invalid periodId');
    }

    const metrics = await kpiTreeService.getMetrics(periodId);

    res.json({
      success: true,
      data: { metrics },
    });
  },

  /**
   * GET /kpi-tree/metrics/compare?periodId=X&baselinePeriodId=Y
   * Get metrics with comparison to baseline period
   */
  getMetricsCompare: async (req: Request, res: Response): Promise<void> => {
    const periodIdStr = req.query['periodId'] as string | undefined;
    const baselinePeriodIdStr = req.query['baselinePeriodId'] as string | undefined;

    if (!periodIdStr) {
      throw validationError('periodId is required');
    }
    if (!baselinePeriodIdStr) {
      throw validationError('baselinePeriodId is required');
    }

    const periodId = parseInt(periodIdStr, 10);
    const baselinePeriodId = parseInt(baselinePeriodIdStr, 10);

    if (isNaN(periodId)) {
      throw validationError('Invalid periodId');
    }
    if (isNaN(baselinePeriodId)) {
      throw validationError('Invalid baselinePeriodId');
    }

    const metrics = await kpiTreeService.getMetricsCompare(periodId, baselinePeriodId);

    res.json({
      success: true,
      data: { metrics },
    });
  },
};
