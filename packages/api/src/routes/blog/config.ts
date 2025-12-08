import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/index.js';
import { asyncHandler } from '../../middleware/index.js';

const router = Router();

/**
 * GET /api/blog/config
 * Get public blog configuration
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const config = await prisma.blogConfig.findUnique({
      where: { id: 1 },
    });

    // Return defaults if not found
    if (!config) {
      res.json({
        siteTitle: 'Tim Callagy',
        siteDescription: null,
        socialLinkedIn: null,
        socialGitHub: null,
        showPromoBanner: true,
        promoBannerImage: null,
        promoBannerLink: null,
        promoBannerAlt: null,
      });
      return;
    }

    // Return only public fields
    res.json({
      siteTitle: config.siteTitle,
      siteDescription: config.siteDescription,
      socialLinkedIn: config.socialLinkedIn,
      socialGitHub: config.socialGitHub,
      showPromoBanner: config.showPromoBanner,
      promoBannerImage: config.promoBannerImage,
      promoBannerLink: config.promoBannerLink,
      promoBannerAlt: config.promoBannerAlt,
    });
  })
);

export { router as configRouter };
