import { Router } from 'express';
import { notesController } from '../controllers/notes.js';
import { apiKeyAuth, asyncHandler } from '../middleware/index.js';

const router = Router();

// All routes require API key authentication
router.use(apiKeyAuth);

// GET /notes - List notes with filters
router.get('/', asyncHandler(notesController.list));

// POST /notes - Create a new note
router.post('/', asyncHandler(notesController.create));

// GET /notes/:id - Get a single note
router.get('/:id', asyncHandler(notesController.get));

// PUT /notes/:id - Update a note
router.put('/:id', asyncHandler(notesController.update));

// DELETE /notes/:id - Delete a note
router.delete('/:id', asyncHandler(notesController.delete));

export { router as notesRouter };
