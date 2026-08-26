export const NOTIFICATION_BATCH_MINIMUM = 1;
export const NOTIFICATION_BATCH_MAXIMUM = 100;
export const NOTIFICATION_BATCH_DEFAULT = 25;
export const NOTIFICATION_LEASE_SECONDS_DEFAULT = 120;
export const NOTIFICATION_LEASE_SECONDS_MINIMUM = 30;
export const NOTIFICATION_LEASE_SECONDS_MAXIMUM = 600;

export function boundedNotificationInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error('INVALID_NOTIFICATION_LIMIT');
  }
  return parsed;
}

export function notificationSummaryProcessed(summary: {
  delivered: number;
  failed: number;
}): number {
  return summary.delivered + summary.failed;
}
