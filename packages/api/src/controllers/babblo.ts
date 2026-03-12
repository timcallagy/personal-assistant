import { Request, Response } from 'express';
import {
  getBabbloUserList,
  getBabbloStats,
  getBabbloUserProfile,
  type LifecycleStage,
} from '../lib/babblo-queries.js';

const VALID_STAGES: LifecycleStage[] = [
  'trial_not_started',
  'trial_active',
  'trial_exhausted',
  'purchased',
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const babbloController = {
  listUsers: async (req: Request, res: Response): Promise<void> => {
    const pageRaw = req.query['page'];
    const pageSizeRaw = req.query['pageSize'];
    const stage = req.query['stage'] as string | undefined;

    const page = pageRaw ? parseInt(pageRaw as string, 10) : 1;
    const pageSize = pageSizeRaw ? parseInt(pageSizeRaw as string, 10) : 50;

    if (!Number.isInteger(page) || page < 1) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'page must be a positive integer' } });
      return;
    }
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'pageSize must be between 1 and 100' } });
      return;
    }
    if (stage && !VALID_STAGES.includes(stage as LifecycleStage)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `stage must be one of: ${VALID_STAGES.join(', ')}` },
      });
      return;
    }

    const { rows, total } = await getBabbloUserList(page, pageSize, stage);
    res.json({ success: true, data: { users: rows, total, page, pageSize } });
  },

  getStats: async (_req: Request, res: Response): Promise<void> => {
    const stats = await getBabbloStats();
    res.json({ success: true, data: stats });
  },

  getUserProfile: async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'id must be a valid UUID' } });
      return;
    }

    const profile = await getBabbloUserProfile(id);
    if (!profile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    res.json({ success: true, data: profile });
  },
};
