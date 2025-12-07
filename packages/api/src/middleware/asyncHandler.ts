import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrapper for async route handlers that catches errors and passes them to next()
 * This prevents having to wrap every async handler in try/catch
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => {
 *     // async code here
 *   }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
