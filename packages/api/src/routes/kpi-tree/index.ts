/**
 * KPI Tree Routes
 * Handles KPI driver tree API endpoints
 */

import { Router } from 'express';
import { kpiTreeController } from '../../controllers/kpiTree.js';
import { asyncHandler } from '../../middleware/index.js';

const router = Router();

// Note: KPI tree endpoints are public (no authentication required)
// They display sample/demo data for the visualization

// GET /kpi-tree/periods - List all periods
router.get('/periods', asyncHandler(kpiTreeController.listPeriods));

// GET /kpi-tree/periods/current - Get the current period
router.get('/periods/current', asyncHandler(kpiTreeController.getCurrentPeriod));

// GET /kpi-tree/periods/:id - Get a single period
router.get('/periods/:id', asyncHandler(kpiTreeController.getPeriod));

// GET /kpi-tree/metrics?periodId=X - Get metrics for a period
router.get('/metrics', asyncHandler(kpiTreeController.getMetrics));

// GET /kpi-tree/metrics/compare?periodId=X&baselinePeriodId=Y - Compare periods
router.get('/metrics/compare', asyncHandler(kpiTreeController.getMetricsCompare));

export { router as kpiTreeRouter };
