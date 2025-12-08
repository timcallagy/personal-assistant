import { Router } from 'express';
import { postsRouter } from './posts.js';
import { categoriesRouter } from './categories.js';
import { configRouter } from './config.js';
import { newsletterRouter } from './newsletter.js';
import { adminRouter } from './admin/index.js';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'blog' });
});

// Public routes (no auth required)
router.use('/posts', postsRouter);
router.use('/categories', categoriesRouter);
router.use('/config', configRouter);
router.use('/newsletter', newsletterRouter);

// Admin routes (auth required)
router.use('/admin', adminRouter);

export { router as blogRouter };
