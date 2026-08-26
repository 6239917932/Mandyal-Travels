export const MAINTENANCE_BATCH_MINIMUM = 1;
export const MAINTENANCE_BATCH_MAXIMUM = 100;
export const MAINTENANCE_BATCH_DEFAULT = 25;
export const MAINTENANCE_LEASE_SECONDS_DEFAULT = 120;
export const MAINTENANCE_LEASE_SECONDS_MINIMUM = 30;
export const MAINTENANCE_LEASE_SECONDS_MAXIMUM = 600;

export function boundedMaintenanceInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error('INVALID_AUTOMATION_LIMIT');
  }
  return parsed;
}

export function maintenanceSummaryProcessed(summary: {
  expiredAvailabilityLocks: number;
  expiredBusSeatHolds: number;
  releasedPromotionClaims: number;
}): number {
  return (
    summary.expiredAvailabilityLocks + summary.expiredBusSeatHolds + summary.releasedPromotionClaims
  );
}
