import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/index.js';
import { asyncHandler } from '../../middleware/index.js';
import { BlogCategory } from '@pa/shared';

const router = Router();

/**
 * GET /api/blog/categories
 * List all blog categories with post counts
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    // Fetch all categories
    const categories = await prisma.blogCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    // Count published posts per category
    const now = new Date();
    const categoriesWithCounts: BlogCategory[] = await Promise.all(
      categories.map(async (cat) => {
        const postCount = await prisma.blogPost.count({
          where: {
            category: cat.slug,
            status: 'PUBLISHED',
            publishedAt: { lte: now },
          },
        });
        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          sortOrder: cat.sortOrder,
          postCount,
        };
      })
    );

    res.json({ success: true, data: { categories: categoriesWithCounts } });
  })
);

export { router as categoriesRouter };
