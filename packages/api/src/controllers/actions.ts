import { Request, Response } from 'express';
import * as actionService from '../services/actionService.js';
import { validateActionInput, validateProjectName } from '../lib/validators.js';
import type { ActionsFilter } from '@pa/shared';

/**
 * Parse comma-separated string to array
 */
function parseArrayParam(value: unknown): string[] | undefined {
  if (!value || typeof value !== 'string') {
    return undefined;
  }
  return value.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
}

export const actionsController = {
  /**
   * GET /actions
   * List actions with optional filters
   */
  list: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const filters: ActionsFilter = {
      project: req.query['project'] as string | undefined,
      labels: parseArrayParam(req.query['labels']),
      status: (req.query['status'] as 'open' | 'completed') || 'open',
      sort: req.query['sort'] as ActionsFilter['sort'] || 'priority',
      order: req.query['order'] as 'asc' | 'desc' || 'desc',
      top: req.query['top'] ? parseInt(req.query['top'] as string, 10) : undefined,
      search: req.query['search'] as string | undefined,
      limit: req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined,
      offset: req.query['offset'] ? parseInt(req.query['offset'] as string, 10) : undefined,
    };

    const { actions, total } = await actionService.getActions(userId, filters);

    res.json({
      success: true,
      data: {
        actions,
        total,
        limit: filters.top || filters.limit || 50,
        offset: filters.top ? 0 : (filters.offset || 0),
      },
    });
  },

  /**
   * GET /actions/completed
   * List completed actions
   */
  listCompleted: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const filters: ActionsFilter = {
      project: req.query['project'] as string | undefined,
      labels: parseArrayParam(req.query['labels']),
      status: 'completed',
      sort: 'created_at',
      order: 'desc',
      limit: req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined,
      offset: req.query['offset'] ? parseInt(req.query['offset'] as string, 10) : undefined,
    };

    const { actions, total } = await actionService.getActions(userId, filters);

    res.json({
      success: true,
      data: {
        actions,
        total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
      },
    });
  },

  /**
   * POST /actions
   * Create a new action
   */
  create: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const { title, urgency, importance, source } = validateActionInput(req.body);
    const projectName = validateProjectName(req.body.project);
    const labelNames = Array.isArray(req.body.labels) ? req.body.labels : [];

    const action = await actionService.createAction(userId, {
      title,
      projectName,
      labelNames,
      urgency,
      importance,
      source,
    });

    res.status(201).json({
      success: true,
      data: { action },
    });
  },

  /**
   * GET /actions/:id
   * Get a single action by ID
   */
  get: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const actionId = parseInt(req.params['id']!, 10);

    if (isNaN(actionId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid action ID',
        },
      });
      return;
    }

    const action = await actionService.getAction(userId, actionId);

    res.json({
      success: true,
      data: { action },
    });
  },

  /**
   * PUT /actions/:id
   * Update an action
   */
  update: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const actionId = parseInt(req.params['id']!, 10);

    if (isNaN(actionId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid action ID',
        },
      });
      return;
    }

    const updateData: {
      title?: string;
      projectName?: string;
      labelNames?: string[];
      urgency?: number;
      importance?: number;
    } = {};

    if (req.body.title !== undefined) {
      updateData.title = req.body.title;
    }

    if (req.body.project !== undefined) {
      updateData.projectName = req.body.project;
    }

    if (req.body.labels !== undefined) {
      updateData.labelNames = Array.isArray(req.body.labels) ? req.body.labels : [];
    }

    if (req.body.urgency !== undefined) {
      const urgency = parseInt(req.body.urgency, 10);
      if (isNaN(urgency) || urgency < 1 || urgency > 5) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Urgency must be between 1 and 5',
          },
        });
        return;
      }
      updateData.urgency = urgency;
    }

    if (req.body.importance !== undefined) {
      const importance = parseInt(req.body.importance, 10);
      if (isNaN(importance) || importance < 1 || importance > 5) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Importance must be between 1 and 5',
          },
        });
        return;
      }
      updateData.importance = importance;
    }

    const action = await actionService.updateAction(userId, actionId, updateData);

    res.json({
      success: true,
      data: { action },
    });
  },

  /**
   * DELETE /actions/:id
   * Delete an action
   */
  delete: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const actionId = parseInt(req.params['id']!, 10);

    if (isNaN(actionId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid action ID',
        },
      });
      return;
    }

    await actionService.deleteAction(userId, actionId);

    res.json({
      success: true,
      message: 'Action deleted successfully',
    });
  },

  /**
   * POST /actions/complete
   * Complete multiple actions
   */
  complete: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    if (!Array.isArray(req.body.ids)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'ids must be an array of action IDs',
        },
      });
      return;
    }

    const ids = req.body.ids.map((id: unknown) => parseInt(String(id), 10)).filter((id: number) => !isNaN(id));

    const result = await actionService.completeActions(userId, ids);

    res.json({
      success: true,
      data: result,
    });
  },
};
