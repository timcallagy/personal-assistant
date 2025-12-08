import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/index.js';
import { asyncHandler } from '../../middleware/index.js';
import { validationError, conflictError } from '../../lib/errors.js';
import { NewsletterSubscribeRequest } from '@pa/shared';

const router = Router();

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/blog/newsletter/subscribe
 * Subscribe to newsletter
 */
router.post(
  '/subscribe',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, consent, source = 'blog-sidebar' } = req.body as NewsletterSubscribeRequest;

    // Validate email
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      throw validationError('Valid email is required');
    }

    // Validate consent - must be exactly true
    if (consent !== true) {
      throw validationError('Consent is required to subscribe');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing subscriber
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      if (existing.unsubscribedAt === null) {
        // Already actively subscribed
        throw conflictError('Email is already subscribed');
      }

      // Reactivate - previously unsubscribed
      const now = new Date();
      await prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: {
          unsubscribedAt: null,
          subscribedAt: now,
          source,
          consentText: `I agree to receive newsletter emails about AI topics from Tim Callagy. Resubscribed via ${source} on ${now.toISOString()}.`,
          ipAddress: getClientIp(req),
        },
      });

      res.status(201).json({
        message: 'Successfully resubscribed to newsletter',
        email: normalizedEmail,
      });
      return;
    }

    // Create new subscriber
    const now = new Date();
    await prisma.newsletterSubscriber.create({
      data: {
        email: normalizedEmail,
        subscribedAt: now,
        consentText: `I agree to receive newsletter emails about AI topics from Tim Callagy. Subscribed via ${source} on ${now.toISOString()}.`,
        ipAddress: getClientIp(req),
        source,
      },
    });

    res.status(201).json({
      message: 'Successfully subscribed to newsletter',
      email: normalizedEmail,
    });
  })
);

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const firstIp = forwarded.split(',')[0];
    return firstIp ? firstIp.trim() : null;
  }
  return req.ip || null;
}

export { router as newsletterRouter };
