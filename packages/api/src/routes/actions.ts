import { Router } from 'express';
import { actionsController } from '../controllers/actions.js';
import { apiKeyAuth, asyncHandler } from '../middleware/index.js';

const router = Router();

// All routes require API key authentication
router.use(apiKeyAuth);

// GET /actions - List actions with filters
router.get('/', asyncHandler(actionsController.list));

// GET /actions/completed - List completed actions
router.get('/completed', asyncHandler(actionsController.listCompleted));

// POST /actions - Create a new action
router.post('/', asyncHandler(actionsController.create));

// POST /actions/complete - Complete multiple actions
router.post('/complete', asyncHandler(actionsController.complete));

// GET /actions/:id - Get a single action
router.get('/:id', asyncHandler(actionsController.get));

// PUT /actions/:id - Update an action
router.put('/:id', asyncHandler(actionsController.update));

// DELETE /actions/:id - Delete an action
router.delete('/:id', asyncHandler(actionsController.delete));

export { router as actionsRouter };
