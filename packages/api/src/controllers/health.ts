import { Request, Response } from 'express';
import { prisma } from '../lib/index.js';

export const healthController = {
  check: async (_req: Request, res: Response): Promise<void> => {
    let databaseStatus = 'disconnected';

    try {
      // Check database connection with a simple query
      await prisma.$queryRaw`SELECT 1`;
      databaseStatus = 'connected';
    } catch {
      databaseStatus = 'disconnected';
    }

    res.json({
      success: true,
      message: 'PA API is running',
      timestamp: new Date().toISOString(),
      database: databaseStatus,
    });
  },
};
