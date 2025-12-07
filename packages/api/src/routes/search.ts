import { Router } from 'express';
import { searchController } from '../controllers/search.js';
import { apiKeyAuth, asyncHandler } from '../middleware/index.js';

const router = Router();

// All routes require API key authentication
router.use(apiKeyAuth);

// GET /search - Unified search
router.get('/', asyncHandler(searchController.search));

export { router as searchRouter };
