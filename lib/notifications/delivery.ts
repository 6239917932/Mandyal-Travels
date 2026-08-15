export function notificationRetryAt(attempts: number, now = new Date()): Date {
  const boundedAttempts = Math.max(0, Math.min(attempts, 20));
  const delayMinutes = Math.min(24 * 60, 2 ** boundedAttempts);
  return new Date(now.getTime() + delayMinutes * 60_000);
}

export function sanitizeDeliveryError(value: unknown): string {
  return (value instanceof Error ? value.message : String(value))
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 500);
}
