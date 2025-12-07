import { Request, Response } from 'express';
import * as noteService from '../services/noteService.js';
import { validateNoteInput, validateProjectName } from '../lib/validators.js';

/**
 * Parse comma-separated string to array
 */
function parseArrayParam(value: unknown): string[] | undefined {
  if (!value || typeof value !== 'string') {
    return undefined;
  }
  return value.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
}

export const notesController = {
  /**
   * GET /notes
   * List notes with optional filters
   */
  list: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const filters = {
      project: req.query['project'] as string | undefined,
      labels: parseArrayParam(req.query['labels']),
      important: req.query['important'] === 'true' ? true :
                 req.query['important'] === 'false' ? false : undefined,
      fromDate: req.query['from_date'] as string | undefined,
      toDate: req.query['to_date'] as string | undefined,
      search: req.query['search'] as string | undefined,
      limit: req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined,
      offset: req.query['offset'] ? parseInt(req.query['offset'] as string, 10) : undefined,
    };

    const { notes, total } = await noteService.getNotes(userId, filters);

    res.json({
      success: true,
      data: {
        notes,
        total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
      },
    });
  },

  /**
   * POST /notes
   * Create a new note
   */
  create: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const { summary, source, important } = validateNoteInput(req.body);
    const projectName = validateProjectName(req.body.project);
    const labelNames = Array.isArray(req.body.labels) ? req.body.labels : [];

    const note = await noteService.createNote(userId, {
      summary,
      projectName,
      labelNames,
      important,
      source,
    });

    res.status(201).json({
      success: true,
      data: { note },
    });
  },

  /**
   * GET /notes/:id
   * Get a single note by ID
   */
  get: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const noteId = parseInt(req.params['id']!, 10);

    if (isNaN(noteId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid note ID',
        },
      });
      return;
    }

    const note = await noteService.getNote(userId, noteId);

    res.json({
      success: true,
      data: { note },
    });
  },

  /**
   * PUT /notes/:id
   * Update a note
   */
  update: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const noteId = parseInt(req.params['id']!, 10);

    if (isNaN(noteId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid note ID',
        },
      });
      return;
    }

    const updateData: {
      summary?: string;
      projectName?: string;
      labelNames?: string[];
      important?: boolean;
    } = {};

    if (req.body.summary !== undefined) {
      updateData.summary = req.body.summary;
    }

    if (req.body.project !== undefined) {
      updateData.projectName = req.body.project;
    }

    if (req.body.labels !== undefined) {
      updateData.labelNames = Array.isArray(req.body.labels) ? req.body.labels : [];
    }

    if (req.body.important !== undefined) {
      updateData.important = Boolean(req.body.important);
    }

    const note = await noteService.updateNote(userId, noteId, updateData);

    res.json({
      success: true,
      data: { note },
    });
  },

  /**
   * DELETE /notes/:id
   * Delete a note
   */
  delete: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const noteId = parseInt(req.params['id']!, 10);

    if (isNaN(noteId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid note ID',
        },
      });
      return;
    }

    await noteService.deleteNote(userId, noteId);

    res.json({
      success: true,
      message: 'Note deleted successfully',
    });
  },
};
