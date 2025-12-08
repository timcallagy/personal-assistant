import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/index.js';
import { asyncHandler } from '../../middleware/index.js';
import { notFoundError } from '../../lib/errors.js';
import {
  BlogPostSummary,
  Pagination,
  calculateReadingTime,
  generateExcerpt,
} from '@pa/shared';

const router = Router();

/**
 * GET /api/blog/posts
 * List published blog posts with pagination and filtering
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query['limit'] as string) || 12));
    const category = req.query['category'] as string | undefined;
    const tag = req.query['tag'] as string | undefined;
    const featured = req.query['featured'] === 'true';

    const now = new Date();
    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      status: 'PUBLISHED';
      publishedAt: { lte: Date };
      category?: string;
      tags?: { has: string };
    } = {
      status: 'PUBLISHED',
      publishedAt: { lte: now },
    };

    if (category) {
      where.category = category;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    // Fetch posts
    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: featured ? 0 : skip,
        take: featured ? 5 : limit,
        include: {
          author: {
            select: { username: true },
          },
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    // Fetch category names for posts
    const categoryMap = new Map<string, string>();
    const categorySlugs = [...new Set(posts.map((p) => p.category))];
    if (categorySlugs.length > 0) {
      const categories = await prisma.blogCategory.findMany({
        where: { slug: { in: categorySlugs } },
        select: { slug: true, name: true },
      });
      categories.forEach((c) => categoryMap.set(c.slug, c.name));
    }

    // Transform to response format
    const postSummaries: BlogPostSummary[] = posts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || generateExcerpt(post.content),
      featuredImage: post.featuredImage,
      category: post.category,
      categoryName: categoryMap.get(post.category) || post.category,
      tags: post.tags,
      publishedAt: post.publishedAt,
      readingTime: calculateReadingTime(post.content),
      author: {
        name: post.author.username,
      },
    }));

    const totalPages = Math.ceil(total / limit);
    const pagination: Pagination = {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    };

    res.json({ posts: postSummaries, pagination });
  })
);

/**
 * GET /api/blog/posts/:slug
 * Get a single published post by slug
 */
router.get(
  '/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const now = new Date();

    const post = await prisma.blogPost.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
        publishedAt: { lte: now },
      },
      include: {
        author: {
          select: { id: true, username: true },
        },
      },
    });

    if (!post) {
      throw notFoundError('Post not found');
    }

    // Get category name
    const category = await prisma.blogCategory.findUnique({
      where: { slug: post.category },
      select: { name: true },
    });

    // Get related posts (same category, excluding current)
    const relatedPosts = await prisma.blogPost.findMany({
      where: {
        category: post.category,
        status: 'PUBLISHED',
        publishedAt: { lte: now },
        id: { not: post.id },
      },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: {
        id: true,
        title: true,
        slug: true,
        featuredImage: true,
      },
    });

    // Get previous post
    const previousPost = await prisma.blogPost.findFirst({
      where: {
        status: 'PUBLISHED',
        publishedAt: { lt: post.publishedAt!, lte: now },
      },
      orderBy: { publishedAt: 'desc' },
      select: { title: true, slug: true },
    });

    // Get next post
    const nextPost = await prisma.blogPost.findFirst({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gt: post.publishedAt!, lte: now },
      },
      orderBy: { publishedAt: 'asc' },
      select: { title: true, slug: true },
    });

    res.json({
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt || generateExcerpt(post.content),
      featuredImage: post.featuredImage,
      metaDescription: post.metaDescription,
      category: post.category,
      categoryName: category?.name || post.category,
      tags: post.tags,
      publishedAt: post.publishedAt,
      readingTime: calculateReadingTime(post.content),
      viewCount: post.viewCount,
      author: {
        id: post.author.id,
        name: post.author.username,
        username: post.author.username,
      },
      relatedPosts,
      previousPost,
      nextPost,
    });
  })
);

/**
 * POST /api/blog/posts/:slug/view
 * Increment view count for a post
 */
router.post(
  '/:slug/view',
  asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const now = new Date();

    const post = await prisma.blogPost.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
        publishedAt: { lte: now },
      },
      select: { id: true },
    });

    if (!post) {
      throw notFoundError('Post not found');
    }

    // Fire and forget - increment view count
    prisma.blogPost
      .update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch(console.error);

    res.status(204).send();
  })
);

/**
 * GET /api/blog/tags
 * Get all tags with usage counts
 */
router.get(
  '/meta/tags',
  asyncHandler(async (_req: Request, res: Response) => {
    const now = new Date();

    // Fetch all published posts' tags
    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { lte: now },
      },
      select: { tags: true },
    });

    // Count tag occurrences
    const tagCounts = new Map<string, number>();
    posts.forEach((post) => {
      post.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    // Convert to array and sort by count
    const tags = Array.from(tagCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    res.json({ tags });
  })
);

/**
 * GET /api/blog/popular
 * Get popular posts by view count
 */
router.get(
  '/meta/popular',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(10, Math.max(1, parseInt(req.query['limit'] as string) || 5));
    const now = new Date();

    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { lte: now },
      },
      orderBy: { viewCount: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        featuredImage: true,
        publishedAt: true,
      },
    });

    res.json({ posts });
  })
);

export { router as postsRouter };
