import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export function isSafeHostedCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
}

export function paymentIntentExpiry(now = new Date()): Date {
  return new Date(now.getTime() + 20 * 60 * 1_000);
}

export function paymentPayloadHash(payload: string): string {
  return createHash('sha256').update(payload).digest('hex');
}

export function verifyPaymentWebhook(input: {
  payload: string;
  signature: string;
  timestamp: string;
  secret: string;
  now?: number;
}): boolean {
  const timestamp = Number(input.timestamp);
  const now = input.now ?? Date.now();
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp * 1_000) > 5 * 60 * 1_000)
    return false;
  const expected = createHmac('sha256', input.secret)
    .update(`${input.timestamp}.${input.payload}`)
    .digest('hex');
  const received = input.signature.replace(/^sha256=/, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(received)) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
}
