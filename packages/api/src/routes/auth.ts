import { Router } from 'express';
import { authController } from '../controllers/auth.js';
import { apiKeyAuth, asyncHandler } from '../middleware/index.js';

const router = Router();

// POST /auth/login - Login with username/password
router.post('/login', asyncHandler(authController.login));

// POST /auth/logout - Logout and clear session
router.post('/logout', authController.logout);

// GET /auth/me - Get current user (supports both API key and session)
router.get('/me', apiKeyAuth, authController.me);

// GET /auth/session - Get current user from session only (for web)
router.get('/session', authController.me);

export { router as authRouter };
