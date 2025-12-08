import { Router, Request, Response } from 'express';
import { apiKeyAuth, asyncHandler } from '../../../middleware/index.js';
import { adminPostsRouter } from './posts.js';
import { adminSubscribersRouter } from './subscribers.js';
import { adminConfigRouter } from './config.js';
import { adminImagesRouter } from './images.js';

const router = Router();

// All admin routes require authentication
router.use(apiKeyAuth);

// Health check for admin
router.get(
  '/health',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        service: 'blog-admin',
        user: req.user?.username,
      },
    });
  })
);

// Admin sub-routes
router.use('/posts', adminPostsRouter);
router.use('/subscribers', adminSubscribersRouter);
router.use('/config', adminConfigRouter);
router.use('/images', adminImagesRouter);

export { router as adminRouter };
