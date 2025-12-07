import { Router } from 'express';
import { projectsController } from '../controllers/projects.js';
import { apiKeyAuth, asyncHandler } from '../middleware/index.js';

const router = Router();

// All routes require API key authentication
router.use(apiKeyAuth);

// GET /projects - List all projects
router.get('/', asyncHandler(projectsController.list));

// POST /projects - Create a new project
router.post('/', asyncHandler(projectsController.create));

// GET /projects/:id - Get a single project
router.get('/:id', asyncHandler(projectsController.get));

// DELETE /projects/:id - Delete a project
router.delete('/:id', asyncHandler(projectsController.delete));

export { router as projectsRouter };
