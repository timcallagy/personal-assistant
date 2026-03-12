import { Router, Request, Response } from 'express';
import { verifyUnsubscribeToken } from '../lib/unsubscribe-token.js';
import { prisma } from '../lib/index.js';

const router = Router();

const html = (title: string, message: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — Babblo</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           max-width: 480px; margin: 80px auto; padding: 0 24px; color: #1a1a1a; }
    h1 { font-size: 22px; margin-bottom: 12px; }
    p { color: #555; line-height: 1.6; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${message}</p>
</body>
</html>`;

router.get('/', async (req: Request, res: Response) => {
  const token = req.query['token'] as string | undefined;

  if (!token) {
    res.status(400).send(html('Invalid link', 'This unsubscribe link is invalid.'));
    return;
  }

  const userId = verifyUnsubscribeToken(token);
  if (!userId) {
    res.status(400).send(html('Invalid link', 'This unsubscribe link is invalid or has been tampered with.'));
    return;
  }

  await prisma.emailUnsubscribe.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  res.send(html(
    "You've been unsubscribed",
    "You won't receive any more emails from Babblo. If this was a mistake, you can contact us at support@babblo.app."
  ));
});

export { router as unsubscribeRouter };
