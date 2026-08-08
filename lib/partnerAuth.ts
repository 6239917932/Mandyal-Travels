import { timingSafeEqual } from 'node:crypto';

export function isValidPartnerKey(value: string | null): boolean {
  const expected = process.env.PARTNER_ADMIN_KEY;
  if (!expected || !value) return false;
  const suppliedBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}
