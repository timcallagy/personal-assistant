import { Router, Request, Response } from 'express';
import { prisma } from '../../../lib/index.js';
import { asyncHandler } from '../../../middleware/index.js';
import { validationError } from '../../../lib/errors.js';
import { UpdateBlogConfigRequest } from '@pa/shared';

const router = Router();

/**
 * GET /api/blog/admin/config
 * Get full blog configuration (admin view)
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const config = await prisma.blogConfig.findUnique({
      where: { id: 1 },
    });

    if (!config) {
      // Return defaults
      res.json({
        id: 1,
        showPromoBanner: true,
        promoBannerImage: null,
        promoBannerLink: null,
        promoBannerAlt: null,
        postsPerPage: 12,
        featuredPostsCount: 5,
        siteTitle: 'Tim Callagy',
        siteDescription: null,
        socialLinkedIn: null,
        socialGitHub: null,
        updatedAt: null,
      });
      return;
    }

    res.json(config);
  })
);

/**
 * PUT /api/blog/admin/config
 * Update blog configuration
 */
router.put(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as UpdateBlogConfigRequest;
    const updateData: Record<string, unknown> = {};

    // Validate and collect update fields
    if (body.showPromoBanner !== undefined) {
      updateData['showPromoBanner'] = Boolean(body.showPromoBanner);
    }

    if (body.promoBannerImage !== undefined) {
      if (body.promoBannerImage && !isValidUrl(body.promoBannerImage)) {
        throw validationError('Invalid promo banner image URL');
      }
      updateData['promoBannerImage'] = body.promoBannerImage || null;
    }

    if (body.promoBannerLink !== undefined) {
      if (body.promoBannerLink && !isValidUrl(body.promoBannerLink)) {
        throw validationError('Invalid promo banner link URL');
      }
      updateData['promoBannerLink'] = body.promoBannerLink || null;
    }

    if (body.promoBannerAlt !== undefined) {
      updateData['promoBannerAlt'] = body.promoBannerAlt || null;
    }

    if (body.postsPerPage !== undefined) {
      const num = parseInt(String(body.postsPerPage));
      if (isNaN(num) || num < 1 || num > 50) {
        throw validationError('postsPerPage must be between 1 and 50');
      }
      updateData['postsPerPage'] = num;
    }

    if (body.featuredPostsCount !== undefined) {
      const num = parseInt(String(body.featuredPostsCount));
      if (isNaN(num) || num < 1 || num > 10) {
        throw validationError('featuredPostsCount must be between 1 and 10');
      }
      updateData['featuredPostsCount'] = num;
    }

    if (body.siteTitle !== undefined) {
      if (!body.siteTitle || body.siteTitle.length < 1) {
        throw validationError('Site title is required');
      }
      updateData['siteTitle'] = body.siteTitle;
    }

    if (body.siteDescription !== undefined) {
      updateData['siteDescription'] = body.siteDescription || null;
    }

    if (body.socialLinkedIn !== undefined) {
      if (body.socialLinkedIn && !isValidUrl(body.socialLinkedIn)) {
        throw validationError('Invalid LinkedIn URL');
      }
      updateData['socialLinkedIn'] = body.socialLinkedIn || null;
    }

    if (body.socialGitHub !== undefined) {
      if (body.socialGitHub && !isValidUrl(body.socialGitHub)) {
        throw validationError('Invalid GitHub URL');
      }
      updateData['socialGitHub'] = body.socialGitHub || null;
    }

    // Upsert config
    const config = await prisma.blogConfig.upsert({
      where: { id: 1 },
      update: updateData,
      create: {
        id: 1,
        showPromoBanner: (updateData['showPromoBanner'] as boolean) ?? true,
        promoBannerImage: (updateData['promoBannerImage'] as string) ?? null,
        promoBannerLink: (updateData['promoBannerLink'] as string) ?? null,
        promoBannerAlt: (updateData['promoBannerAlt'] as string) ?? null,
        postsPerPage: (updateData['postsPerPage'] as number) ?? 12,
        featuredPostsCount: (updateData['featuredPostsCount'] as number) ?? 5,
        siteTitle: (updateData['siteTitle'] as string) ?? 'Tim Callagy',
        siteDescription: (updateData['siteDescription'] as string) ?? null,
        socialLinkedIn: (updateData['socialLinkedIn'] as string) ?? null,
        socialGitHub: (updateData['socialGitHub'] as string) ?? null,
      },
    });

    res.json(config);
  })
);

/**
 * Simple URL validation
 */
function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

export { router as adminConfigRouter };
