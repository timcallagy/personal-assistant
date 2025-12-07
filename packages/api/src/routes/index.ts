import { Router } from 'express';
import { healthController } from '../controllers/health.js';
import { authRouter } from './auth.js';
import { projectsRouter } from './projects.js';
import { labelsRouter } from './labels.js';
import { notesRouter } from './notes.js';
import { actionsRouter } from './actions.js';
import { searchRouter } from './search.js';

const router = Router();

// Health check routes
router.get('/health', healthController.check);

// Auth routes
router.use('/auth', authRouter);

// Projects routes
router.use('/projects', projectsRouter);

// Labels routes
router.use('/labels', labelsRouter);

// Notes routes
router.use('/notes', notesRouter);

// Actions routes
router.use('/actions', actionsRouter);

// Search routes
router.use('/search', searchRouter);

export { router };
