export const INTEGRATION_OUTBOX_BATCH_DEFAULT = 25;
export const INTEGRATION_OUTBOX_BATCH_MINIMUM = 1;
export const INTEGRATION_OUTBOX_BATCH_MAXIMUM = 25;
export const INTEGRATION_OUTBOX_LEASE_SECONDS_DEFAULT = 300;
export const INTEGRATION_OUTBOX_LEASE_SECONDS_MINIMUM = 300;
export const INTEGRATION_OUTBOX_LEASE_SECONDS_MAXIMUM = 900;

export function boundedIntegrationOutboxInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

export function integrationOutboxSummaryProcessed(input: {
  delivered: number;
  failed: number;
}): number {
  return input.delivered + input.failed;
}
