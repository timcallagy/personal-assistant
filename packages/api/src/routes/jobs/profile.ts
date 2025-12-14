import { Router } from 'express';
import { jobProfileController } from '../../controllers/jobProfile.js';
import { apiKeyAuth, asyncHandler } from '../../middleware/index.js';

const router = Router();

// All routes require authentication
router.use(apiKeyAuth);

// GET /jobs/profile - Get job profile
router.get('/', asyncHandler(jobProfileController.get));

// PUT /jobs/profile - Create or update job profile
router.put('/', asyncHandler(jobProfileController.upsert));

// DELETE /jobs/profile - Delete job profile
router.delete('/', asyncHandler(jobProfileController.delete));

export { router as profileRouter };
