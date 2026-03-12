import crypto from 'crypto';

const SECRET = process.env['UNSUBSCRIBE_SECRET'] ?? 'default-unsubscribe-secret-change-me';

export function generateUnsubscribeToken(userId: string): string {
  const encoded = Buffer.from(userId).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(userId).digest('base64url');
  return `${sig}.${encoded}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return null;

  const sig = token.slice(0, dotIndex);
  const encoded = token.slice(dotIndex + 1);

  let userId: string;
  try {
    userId = Buffer.from(encoded, 'base64url').toString('utf8');
  } catch {
    return null;
  }

  const expected = crypto.createHmac('sha256', SECRET).update(userId).digest('base64url');

  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }

  return userId;
}
