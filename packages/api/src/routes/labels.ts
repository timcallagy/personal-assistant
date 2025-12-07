import { Router } from 'express';
import { labelsController } from '../controllers/labels.js';
import { apiKeyAuth, asyncHandler } from '../middleware/index.js';

const router = Router();

// All routes require API key authentication
router.use(apiKeyAuth);

// GET /labels - List all labels
router.get('/', asyncHandler(labelsController.list));

// POST /labels - Create a new label
router.post('/', asyncHandler(labelsController.create));

// GET /labels/:id - Get a single label
router.get('/:id', asyncHandler(labelsController.get));

// DELETE /labels/:id - Delete a label
router.delete('/:id', asyncHandler(labelsController.delete));

export { router as labelsRouter };
