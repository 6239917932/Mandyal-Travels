import { timingSafeEqual } from 'node:crypto';

import { readConfiguredSecret } from '@/lib/security/configuredSecret';

export function isValidPartnerKey(value: string | null): boolean {
  const expected = readConfiguredSecret('PARTNER_ADMIN_KEY');
  if (!expected || !value) return false;
  const suppliedBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}
