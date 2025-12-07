import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma, validationError, unauthorizedError } from '../lib/index.js';
import { config } from '../config.js';

const SESSION_COOKIE = 'pa_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export const authController = {
  /**
   * POST /auth/login
   * Login with username and password
   */
  login: async (req: Request, res: Response): Promise<void> => {
    const { username, password } = req.body;

    if (!username || !password) {
      const error = validationError('Username and password are required');
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      const error = unauthorizedError('Invalid username or password');
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      const error = unauthorizedError('Invalid username or password');
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
      return;
    }

    // Set session cookie (simple session token = base64 of id:username)
    const sessionToken = Buffer.from(`${user.id}:${user.username}`).toString('base64');

    res.cookie(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
        },
      },
    });
  },

  /**
   * POST /auth/logout
   * Logout and clear session cookie
   */
  logout: (_req: Request, res: Response): void => {
    res.clearCookie(SESSION_COOKIE);
    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  },

  /**
   * GET /auth/me
   * Returns the currently authenticated user
   */
  me: (req: Request, res: Response): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          username: req.user.username,
        },
      },
    });
  },
};
