import { Router } from 'express';
import { companiesController } from '../../controllers/companies.js';
import { apiKeyAuth, asyncHandler } from '../../middleware/index.js';

const router = Router();

// All routes require authentication
router.use(apiKeyAuth);

// GET /jobs/companies - List all companies
router.get('/', asyncHandler(companiesController.list));

// POST /jobs/companies - Create a company
router.post('/', asyncHandler(companiesController.create));

// GET /jobs/companies/:id - Get a company
router.get('/:id', asyncHandler(companiesController.get));

// PUT /jobs/companies/:id - Update a company
router.put('/:id', asyncHandler(companiesController.update));

// DELETE /jobs/companies/:id - Delete a company
router.delete('/:id', asyncHandler(companiesController.delete));

export { router as companiesRouter };
