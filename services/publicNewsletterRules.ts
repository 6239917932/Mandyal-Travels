import { isValidEmail, normalizeEmail } from '../lib/auth/validation.ts';

export const PUBLIC_NEWSLETTER_BODY_LIMIT_BYTES = 2 * 1024;

export function normalizeNewsletterSubscription(body: Record<string, unknown>) {
  const email = normalizeEmail(typeof body.email === 'string' ? body.email.trim() : '');
  if (!isValidEmail(email)) {
    return { error: 'Enter a valid email address.', ok: false } as const;
  }

  return { data: { email }, ok: true } as const;
}
