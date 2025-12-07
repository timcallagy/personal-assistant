import { Request, Response } from 'express';
import * as labelService from '../services/labelService.js';
import { validateLabelName } from '../lib/validators.js';

export const labelsController = {
  /**
   * GET /labels
   * List all labels for the authenticated user
   */
  list: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const labels = await labelService.getLabels(userId);

    res.json({
      success: true,
      data: { labels },
    });
  },

  /**
   * POST /labels
   * Create a new label
   */
  create: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const name = validateLabelName(req.body.name);

    const label = await labelService.createLabel(userId, name);

    res.status(201).json({
      success: true,
      data: { label },
    });
  },

  /**
   * GET /labels/:id
   * Get a single label by ID
   */
  get: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const labelId = parseInt(req.params['id']!, 10);

    if (isNaN(labelId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid label ID',
        },
      });
      return;
    }

    const label = await labelService.getLabel(userId, labelId);

    res.json({
      success: true,
      data: { label },
    });
  },

  /**
   * DELETE /labels/:id
   * Delete a label
   */
  delete: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const labelId = parseInt(req.params['id']!, 10);

    if (isNaN(labelId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid label ID',
        },
      });
      return;
    }

    await labelService.deleteLabel(userId, labelId);

    res.json({
      success: true,
      message: 'Label deleted successfully',
    });
  },
};
