import { Request, Response } from 'express';
import * as searchService from '../services/searchService.js';
import { validationError } from '../lib/index.js';
import type { SearchParams } from '@pa/shared';

/**
 * Parse comma-separated string to array
 */
function parseArrayParam(value: unknown): string[] | undefined {
  if (!value || typeof value !== 'string') {
    return undefined;
  }
  return value.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
}

export const searchController = {
  /**
   * GET /search
   * Unified search across notes and actions
   */
  search: async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const query = req.query['q'] as string | undefined;

    if (!query || query.trim().length < 2) {
      throw validationError('Search query must be at least 2 characters.', {
        q: 'Query must be at least 2 characters',
      });
    }

    const params: SearchParams = {
      query: query.trim(),
      type: (req.query['type'] as SearchParams['type']) || 'all',
      project: req.query['project'] as string | undefined,
      labels: parseArrayParam(req.query['labels']),
      limit: req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 20,
    };

    // Validate type
    if (params.type && !['all', 'notes', 'actions'].includes(params.type)) {
      throw validationError('Invalid search type.', {
        type: 'Type must be "all", "notes", or "actions"',
      });
    }

    const result = await searchService.search(userId, params);

    res.json({
      success: true,
      data: result,
    });
  },
};
