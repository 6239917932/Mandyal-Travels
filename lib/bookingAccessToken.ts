import { createHash, createHmac } from 'node:crypto';

import { readConfiguredSecret } from '@/lib/security/configuredSecret';

export function hashBookingAccessToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createBookingAccessToken(idempotencyKey: string): string {
  const secret = readConfiguredSecret('BOOKING_TOKEN_SECRET');
  if (!secret) throw new Error('BOOKING_TOKEN_SECRET is not securely configured.');
  return createHmac('sha256', secret).update(idempotencyKey).digest('hex');
}
