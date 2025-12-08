import { Router, Request, Response } from 'express';
import { prisma } from '../../../lib/index.js';
import { asyncHandler } from '../../../middleware/index.js';
import { notFoundError, validationError } from '../../../lib/errors.js';
import { Pagination } from '@pa/shared';

const router = Router();

/**
 * GET /api/blog/admin/subscribers
 * List newsletter subscribers
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query['limit'] as string) || 50));
    const active = req.query['active'] !== 'false'; // Default to true

    const skip = (page - 1) * limit;

    // Build where clause
    const where = active ? { unsubscribedAt: null } : {};

    const [subscribers, total, stats] = await Promise.all([
      prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { subscribedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          subscribedAt: true,
          source: true,
          unsubscribedAt: true,
        },
      }),
      prisma.newsletterSubscriber.count({ where }),
      getStats(),
    ]);

    const totalPages = Math.ceil(total / limit);
    const pagination: Pagination = {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    };

    res.json({
      subscribers,
      pagination,
      stats,
    });
  })
);

/**
 * DELETE /api/blog/admin/subscribers/:id
 * Soft delete (unsubscribe) a subscriber
 */
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params['id'] || '');

    if (isNaN(id)) {
      throw validationError('Invalid subscriber ID');
    }

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { id },
    });

    if (!existing) {
      throw notFoundError('Subscriber not found');
    }

    if (existing.unsubscribedAt) {
      // Already unsubscribed
      res.status(204).send();
      return;
    }

    await prisma.newsletterSubscriber.update({
      where: { id },
      data: { unsubscribedAt: new Date() },
    });

    res.status(204).send();
  })
);

/**
 * DELETE /api/blog/admin/subscribers/:id/permanent
 * Hard delete for GDPR "right to be forgotten"
 */
router.delete(
  '/:id/permanent',
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params['id'] || '');

    if (isNaN(id)) {
      throw validationError('Invalid subscriber ID');
    }

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { id },
    });

    if (!existing) {
      throw notFoundError('Subscriber not found');
    }

    await prisma.newsletterSubscriber.delete({
      where: { id },
    });

    res.status(204).send();
  })
);

/**
 * GET /api/blog/admin/subscribers/export
 * Export subscribers as CSV
 */
router.get(
  '/export',
  asyncHandler(async (_req: Request, res: Response) => {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { unsubscribedAt: null },
      orderBy: { subscribedAt: 'desc' },
      select: {
        email: true,
        subscribedAt: true,
        source: true,
      },
    });

    // Build CSV
    const lines = ['email,subscribed_at,source'];
    for (const sub of subscribers) {
      lines.push(`${sub.email},${sub.subscribedAt.toISOString()},${sub.source}`);
    }
    const csv = lines.join('\n');

    // Set headers for download
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="subscribers-${date}.csv"`);
    res.send(csv);
  })
);

/**
 * Get subscriber stats
 */
async function getStats() {
  const [total, active] = await Promise.all([
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
  ]);

  return {
    total,
    active,
    unsubscribed: total - active,
  };
}

export { router as adminSubscribersRouter };
