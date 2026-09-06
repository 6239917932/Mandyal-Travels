import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

export const EMAIL_OTP_TTL_MS = 10 * 60 * 1000;
export const EMAIL_OTP_MAX_ATTEMPTS = 5;

export function createEmailOtpCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashEmailOtpCode(challengeId: string, code: string, secret: string) {
  if (secret.trim().length < 32) throw new Error('EMAIL_OTP_SECRET_NOT_CONFIGURED');
  return createHmac('sha256', secret).update(`${challengeId}:${code}`).digest('hex');
}

export function verifyEmailOtpHash(actual: string, expected: string) {
  if (!/^[a-f0-9]{64}$/i.test(actual) || !/^[a-f0-9]{64}$/i.test(expected)) return false;
  return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}
