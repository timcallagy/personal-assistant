import { Resend } from 'resend';
import { prisma } from './prisma.js';

const RESEND_API_KEY = process.env['RESEND_API_KEY'];
const FROM_ADDRESS = 'Tim <support@babblo.app>';
const REPLY_TO = 'support@babblo.app';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export const EMAIL_TYPES = {
  TNS_1: 'trial_not_started_1',
  TNS_2: 'trial_not_started_2',
  TA_1: 'trial_active_1',
  TA_2: 'trial_active_2',
  TE_1: 'trial_exhausted_1',
} as const;

export type EmailType = (typeof EMAIL_TYPES)[keyof typeof EMAIL_TYPES];

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  emailType: EmailType;
  userId: string;
}

export async function sendEmail(
  opts: SendEmailOptions
): Promise<{ sent: boolean; skipped: boolean }> {
  // Deduplication check — never send the same email type to the same user twice
  const existing = await prisma.sentEmail.findUnique({
    where: { userId_emailType: { userId: opts.userId, emailType: opts.emailType } },
  });

  if (existing) {
    return { sent: false, skipped: true };
  }

  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — email not sent to', opts.to);
    return { sent: false, skipped: true };
  }

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: opts.to,
    replyTo: REPLY_TO,
    subject: opts.subject,
    text: opts.text,
  });

  await prisma.sentEmail.create({
    data: { userId: opts.userId, emailType: opts.emailType },
  });

  return { sent: true, skipped: false };
}
