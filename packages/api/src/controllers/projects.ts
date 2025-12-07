import { Request, Response } from 'express';
import * as projectService from '../services/projectService.js';
import { validateProjectName } from '../lib/validators.js';

export const projectsController = {
  /**
   * GET /projects
   * List all projects for the authenticated user
   */
  list: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const projects = await projectService.getProjects(userId);

    res.json({
      success: true,
      data: { projects },
    });
  },

  /**
   * POST /projects
   * Create a new project
   */
  create: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const name = validateProjectName(req.body.name);

    const project = await projectService.createProject(userId, name);

    res.status(201).json({
      success: true,
      data: { project },
    });
  },

  /**
   * GET /projects/:id
   * Get a single project by ID
   */
  get: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const projectId = parseInt(req.params['id']!, 10);

    if (isNaN(projectId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid project ID',
        },
      });
      return;
    }

    const project = await projectService.getProject(userId, projectId);

    res.json({
      success: true,
      data: { project },
    });
  },

  /**
   * DELETE /projects/:id
   * Delete a project
   */
  delete: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const projectId = parseInt(req.params['id']!, 10);

    if (isNaN(projectId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid project ID',
        },
      });
      return;
    }

    await projectService.deleteProject(userId, projectId);

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  },
};
