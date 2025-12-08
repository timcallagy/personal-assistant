import { Router, Request, Response } from 'express';
import { prisma } from '../../../lib/index.js';
import { asyncHandler } from '../../../middleware/index.js';
import { notFoundError, validationError } from '../../../lib/errors.js';
import {
  CreateBlogPostRequest,
  UpdateBlogPostRequest,
  Pagination,
  generateSlug,
} from '@pa/shared';
import { PostStatus, Prisma } from '@prisma/client';

const router = Router();

/**
 * GET /api/blog/admin/posts
 * List all posts (including drafts) for admin
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 20));
    const status = req.query['status'] as string | undefined;
    const search = req.query['search'] as string | undefined;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.BlogPostWhereInput = {
      authorId: req.user!.id,
    };

    if (status && status !== 'all') {
      where.status = status as PostStatus;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          author: {
            select: { username: true },
          },
        },
      }),
      prisma.blogPost.count({ where }),
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
      success: true,
      data: {
        posts: posts.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          status: p.status,
          category: p.category,
          publishAt: p.publishAt,
          publishedAt: p.publishedAt,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          author: { username: p.author.username },
        })),
        pagination,
      },
    });
  })
);

/**
 * GET /api/blog/admin/posts/:id
 * Get a single post by ID (any status)
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params['id'] || '');

    if (isNaN(id)) {
      throw validationError('Invalid post ID');
    }

    const post = await prisma.blogPost.findFirst({
      where: {
        id,
        authorId: req.user!.id,
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

    res.json({ success: true, data: post });
  })
);

/**
 * POST /api/blog/admin/posts
 * Create a new blog post
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as CreateBlogPostRequest;

    // Validate required fields
    if (!body.title || typeof body.title !== 'string' || body.title.length < 1) {
      throw validationError('Title is required');
    }
    if (body.title.length > 200) {
      throw validationError('Title must be 200 characters or less');
    }

    if (!body.content || typeof body.content !== 'string' || body.content.length < 1) {
      throw validationError('Content is required');
    }
    if (body.content.length > 100000) {
      throw validationError('Content must be 100000 characters or less');
    }

    if (!body.category || typeof body.category !== 'string') {
      throw validationError('Category is required');
    }

    // Validate category exists
    const category = await prisma.blogCategory.findUnique({
      where: { slug: body.category },
    });
    if (!category) {
      throw validationError(`Invalid category: ${body.category}`);
    }

    // Validate optional fields
    if (body.excerpt && body.excerpt.length > 300) {
      throw validationError('Excerpt must be 300 characters or less');
    }
    if (body.metaDescription && body.metaDescription.length > 160) {
      throw validationError('Meta description must be 160 characters or less');
    }
    if (body.tags && body.tags.length > 10) {
      throw validationError('Maximum 10 tags allowed');
    }

    // Generate unique slug
    let slug = generateSlug(body.title);
    let slugSuffix = 0;
    while (true) {
      const existing = await prisma.blogPost.findUnique({
        where: { slug: slugSuffix > 0 ? `${slug}-${slugSuffix}` : slug },
      });
      if (!existing) {
        if (slugSuffix > 0) {
          slug = `${slug}-${slugSuffix}`;
        }
        break;
      }
      slugSuffix++;
    }

    // Determine status and publishedAt
    const status = (body.status as PostStatus) || 'DRAFT';
    let publishedAt: Date | null = null;
    let publishAt: Date | null = null;

    if (status === 'PUBLISHED') {
      publishedAt = new Date();
    } else if (status === 'SCHEDULED') {
      if (!body.publishAt) {
        throw validationError('publishAt is required for scheduled posts');
      }
      const scheduledDate = new Date(body.publishAt);
      if (scheduledDate <= new Date()) {
        throw validationError('publishAt must be a future date');
      }
      publishAt = scheduledDate;
    }

    const post = await prisma.blogPost.create({
      data: {
        title: body.title,
        slug,
        content: body.content,
        excerpt: body.excerpt || null,
        featuredImage: body.featuredImage || null,
        metaDescription: body.metaDescription || null,
        category: body.category,
        tags: body.tags || [],
        status,
        publishAt,
        publishedAt,
        authorId: req.user!.id,
      },
      include: {
        author: {
          select: { id: true, username: true },
        },
      },
    });

    res.status(201).json({ success: true, data: post });
  })
);

/**
 * PUT /api/blog/admin/posts/:id
 * Update an existing blog post
 */
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params['id'] || '');
    const body = req.body as UpdateBlogPostRequest;

    if (isNaN(id)) {
      throw validationError('Invalid post ID');
    }

    // Find existing post
    const existing = await prisma.blogPost.findFirst({
      where: {
        id,
        authorId: req.user!.id,
      },
    });

    if (!existing) {
      throw notFoundError('Post not found');
    }

    // Build update data
    const updateData: Prisma.BlogPostUpdateInput = {};

    if (body.title !== undefined) {
      if (body.title.length < 1 || body.title.length > 200) {
        throw validationError('Title must be 1-200 characters');
      }
      updateData.title = body.title;
    }

    if (body.slug !== undefined) {
      if (body.slug !== existing.slug) {
        // Check uniqueness
        const slugExists = await prisma.blogPost.findUnique({
          where: { slug: body.slug },
        });
        if (slugExists) {
          throw validationError('Slug is already in use');
        }
      }
      updateData.slug = body.slug;
    }

    if (body.content !== undefined) {
      if (body.content.length < 1 || body.content.length > 100000) {
        throw validationError('Content must be 1-100000 characters');
      }
      updateData.content = body.content;
    }

    if (body.category !== undefined) {
      const category = await prisma.blogCategory.findUnique({
        where: { slug: body.category },
      });
      if (!category) {
        throw validationError(`Invalid category: ${body.category}`);
      }
      updateData.category = body.category;
    }

    if (body.excerpt !== undefined) {
      if (body.excerpt && body.excerpt.length > 300) {
        throw validationError('Excerpt must be 300 characters or less');
      }
      updateData.excerpt = body.excerpt || null;
    }

    if (body.featuredImage !== undefined) {
      updateData.featuredImage = body.featuredImage || null;
    }

    if (body.metaDescription !== undefined) {
      if (body.metaDescription && body.metaDescription.length > 160) {
        throw validationError('Meta description must be 160 characters or less');
      }
      updateData.metaDescription = body.metaDescription || null;
    }

    if (body.tags !== undefined) {
      if (body.tags.length > 10) {
        throw validationError('Maximum 10 tags allowed');
      }
      updateData.tags = body.tags;
    }

    if (body.status !== undefined) {
      const newStatus = body.status as PostStatus;
      updateData.status = newStatus;

      // Handle status transitions
      if (newStatus === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
        if (!existing.publishedAt) {
          updateData.publishedAt = new Date();
        }
        updateData.publishAt = null;
      } else if (newStatus === 'SCHEDULED') {
        if (!body.publishAt) {
          throw validationError('publishAt is required for scheduled posts');
        }
        const scheduledDate = new Date(body.publishAt);
        if (scheduledDate <= new Date()) {
          throw validationError('publishAt must be a future date');
        }
        updateData.publishAt = scheduledDate;
      } else if (newStatus === 'DRAFT') {
        updateData.publishAt = null;
      }
    } else if (body.publishAt !== undefined) {
      // Update publish date without changing status
      if (existing.status === 'SCHEDULED') {
        const scheduledDate = new Date(body.publishAt);
        if (scheduledDate <= new Date()) {
          throw validationError('publishAt must be a future date');
        }
        updateData.publishAt = scheduledDate;
      }
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: { id: true, username: true },
        },
      },
    });

    res.json({ success: true, data: post });
  })
);

/**
 * DELETE /api/blog/admin/posts/:id
 * Delete a blog post
 */
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params['id'] || '');

    if (isNaN(id)) {
      throw validationError('Invalid post ID');
    }

    const existing = await prisma.blogPost.findFirst({
      where: {
        id,
        authorId: req.user!.id,
      },
    });

    if (!existing) {
      throw notFoundError('Post not found');
    }

    await prisma.blogPost.delete({
      where: { id },
    });

    res.status(204).send();
  })
);

/**
 * POST /api/blog/admin/posts/:id/publish
 * Quick action to publish a post
 */
router.post(
  '/:id/publish',
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params['id'] || '');

    if (isNaN(id)) {
      throw validationError('Invalid post ID');
    }

    const existing = await prisma.blogPost.findFirst({
      where: {
        id,
        authorId: req.user!.id,
      },
    });

    if (!existing) {
      throw notFoundError('Post not found');
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: existing.publishedAt || new Date(),
        publishAt: null,
      },
      include: {
        author: {
          select: { id: true, username: true },
        },
      },
    });

    res.json({ success: true, data: post });
  })
);

/**
 * POST /api/blog/admin/posts/:id/unpublish
 * Quick action to unpublish a post (revert to draft)
 */
router.post(
  '/:id/unpublish',
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params['id'] || '');

    if (isNaN(id)) {
      throw validationError('Invalid post ID');
    }

    const existing = await prisma.blogPost.findFirst({
      where: {
        id,
        authorId: req.user!.id,
      },
    });

    if (!existing) {
      throw notFoundError('Post not found');
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        status: 'DRAFT',
        publishAt: null,
        // Keep publishedAt for history
      },
      include: {
        author: {
          select: { id: true, username: true },
        },
      },
    });

    res.json({ success: true, data: post });
  })
);

export { router as adminPostsRouter };
