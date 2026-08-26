export const SEARCH_PROJECTION_SOURCE_LIMIT_DEFAULT = 5_000;
export const SEARCH_PROJECTION_SOURCE_LIMIT_MINIMUM = 1;
export const SEARCH_PROJECTION_SOURCE_LIMIT_MAXIMUM = 100_000;
export const SEARCH_PROJECTION_LEASE_SECONDS_DEFAULT = 300;
export const SEARCH_PROJECTION_LEASE_SECONDS_MINIMUM = 30;
export const SEARCH_PROJECTION_LEASE_SECONDS_MAXIMUM = 1_800;

export function boundedSearchProjectionInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error('INVALID_SEARCH_PROJECTION_LIMIT');
  }
  return parsed;
}

export function shouldRebuildSearchProjections(status: string): boolean {
  return status === 'ATTENTION';
}
