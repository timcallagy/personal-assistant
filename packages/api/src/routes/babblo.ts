import { Router } from 'express';
import { sessionAuth } from '../middleware/index.js';
import { babbloController } from '../controllers/babblo.js';
import { asyncHandler } from '../middleware/index.js';

export const babbloRouter = Router();

babbloRouter.use(sessionAuth);

// Stats must come before /:id to avoid being captured as a user ID
babbloRouter.get('/stats', asyncHandler(babbloController.getStats));
babbloRouter.get('/', asyncHandler(babbloController.listUsers));
babbloRouter.get('/:id', asyncHandler(babbloController.getUserProfile));
