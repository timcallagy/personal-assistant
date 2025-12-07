import { Request, Response, NextFunction } from 'express';
import { prisma, unauthorizedError, internalError } from '../lib/index.js';

const SESSION_COOKIE = 'pa_session';

/**
 * Session middleware - parses session cookie and attaches user to request
 * Should be used before routes that need optional or required auth
 */
export async function sessionMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const sessionToken = req.cookies[SESSION_COOKIE];

  if (sessionToken && typeof sessionToken === 'string') {
    try {
      const decoded = Buffer.from(sessionToken, 'base64').toString('utf-8');
      const parts = decoded.split(':');
      const idStr = parts[0];
      const username = parts[1];
      if (!idStr || !username) {
        next();
        return;
      }
      const id = parseInt(idStr, 10);

      if (id && username) {
        // Verify user still exists
        const user = await prisma.user.findUnique({
          where: { id },
          select: { id: true, username: true },
        });

        if (user && user.username === username) {
          req.user = { id: user.id, username: user.username };
        }
      }
    } catch {
      // Invalid token, ignore
    }
  }

  next();
}

/**
 * API Key authentication middleware for MCP server
 * Reads X-API-Key header and validates against database
 * Also accepts session-based auth (for web UI)
 */
export async function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // If user is already authenticated via session, allow through
  if (req.user) {
    next();
    return;
  }

  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (!apiKey) {
    const error = unauthorizedError('Authentication required. Provide API key via X-API-Key header or login via web.');
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { apiKey },
      select: { id: true, username: true },
    });

    if (!user) {
      const error = unauthorizedError('Invalid API key. Please check your API key and try again.');
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      username: user.username,
    };

    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    const appError = internalError('An error occurred during authentication.');
    res.status(appError.statusCode).json({
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
      },
    });
  }
}

/**
 * Session authentication middleware for web UI
 * Checks if user is attached to request (set by session middleware)
 */
export function sessionAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    const error = unauthorizedError('You must be logged in to access this resource.');
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  next();
}
