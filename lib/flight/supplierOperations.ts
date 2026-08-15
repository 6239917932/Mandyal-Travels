import { createHash } from 'node:crypto';

export const FLIGHT_OPERATION_TYPES = [
  'HEALTH_CHECK',
  'SEARCH',
  'REPRICE',
  'ORDER_CREATE',
  'ORDER_RETRIEVE',
  'ORDER_CANCEL',
] as const;

export function normalizeProviderCode(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,30}$/.test(normalized))
    throw new Error('Provider code must contain 2-30 letters, numbers, underscores, or hyphens.');
  return normalized;
}

export function flightRequestHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
