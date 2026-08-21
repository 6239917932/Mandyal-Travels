export type OperationalSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';
export type OperationalResult = 'success' | 'failure' | 'degraded';

export type OperationalEventInput = Readonly<{
  actorId?: string;
  correlationId?: string;
  durationMs?: number;
  event: string;
  resourceId?: string;
  resourceType?: string;
  result: OperationalResult;
  severity: OperationalSeverity;
}>;

export type OperationalEvent = Readonly<{
  actorId?: string;
  correlationId?: string;
  durationMs?: number;
  environment: string;
  event: string;
  release: string;
  resourceId?: string;
  resourceType?: string;
  result: OperationalResult;
  service: 'mandyal-travels-portal';
  severity: OperationalSeverity;
  timestamp: string;
}>;

export type OperationalSnapshot = Readonly<{
  availabilityPercent: number;
  backupAgeHours: number;
  deadLetterCount: number;
  notificationFailureCount: number;
  paymentWebhookFailureCount: number;
  p95LatencyMs: number;
  queueOldestAgeMinutes: number;
  supplierSyncFailureCount: number;
}>;

export type AlertPolicy = Readonly<{
  minimumAvailabilityPercent: number;
  maximumBackupAgeHours: number;
  maximumDeadLetterCount: number;
  maximumNotificationFailureCount: number;
  maximumP95LatencyMs: number;
  maximumPaymentWebhookFailureCount: number;
  maximumQueueAgeMinutes: number;
  maximumSupplierSyncFailureCount: number;
}>;

export type OperationalAlert = Readonly<{
  key: keyof OperationalSnapshot;
  message: string;
  severity: 'warning' | 'critical';
  value: number;
}>;

const SAFE_IDENTIFIER = /^[a-zA-Z0-9][a-zA-Z0-9:._/-]{0,127}$/;
const SAFE_EVENT = /^[a-z][a-z0-9_.-]{2,79}$/;

function safeIdentifier(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && SAFE_IDENTIFIER.test(normalized) ? normalized : undefined;
}

function boundedDuration(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) && value >= 0 && value <= 86_400_000
    ? Math.round(value)
    : undefined;
}

export function createOperationalEvent(
  input: OperationalEventInput,
  context: Readonly<{ environment?: string; release?: string; timestamp?: Date }> = {},
): OperationalEvent {
  if (!SAFE_EVENT.test(input.event)) throw new Error('Operational event name is invalid.');

  return {
    ...(safeIdentifier(input.actorId) ? { actorId: safeIdentifier(input.actorId) } : {}),
    ...(safeIdentifier(input.correlationId)
      ? { correlationId: safeIdentifier(input.correlationId) }
      : {}),
    ...(boundedDuration(input.durationMs) !== undefined
      ? { durationMs: boundedDuration(input.durationMs) }
      : {}),
    environment: safeIdentifier(context.environment) ?? 'unknown',
    event: input.event,
    release: safeIdentifier(context.release) ?? 'unknown',
    ...(safeIdentifier(input.resourceId) ? { resourceId: safeIdentifier(input.resourceId) } : {}),
    ...(safeIdentifier(input.resourceType)
      ? { resourceType: safeIdentifier(input.resourceType) }
      : {}),
    result: input.result,
    service: 'mandyal-travels-portal',
    severity: input.severity,
    timestamp: (context.timestamp ?? new Date()).toISOString(),
  };
}

export function emitOperationalEvent(input: OperationalEventInput): void {
  const event = createOperationalEvent(input, {
    environment: process.env.DEPLOYMENT_ENVIRONMENT ?? process.env.NODE_ENV,
    release: process.env.RELEASE_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA,
  });
  const serialized = JSON.stringify(event);
  if (event.severity === 'critical' || event.severity === 'error') console.error(serialized);
  else if (event.severity === 'warning') console.warn(serialized);
  else console.info(serialized);
}

export const defaultAlertPolicy: AlertPolicy = {
  maximumBackupAgeHours: 25,
  maximumDeadLetterCount: 0,
  maximumNotificationFailureCount: 5,
  maximumP95LatencyMs: 2_000,
  maximumPaymentWebhookFailureCount: 0,
  maximumQueueAgeMinutes: 15,
  maximumSupplierSyncFailureCount: 3,
  minimumAvailabilityPercent: 99.9,
};

export function evaluateOperationalAlerts(
  snapshot: OperationalSnapshot,
  policy: AlertPolicy = defaultAlertPolicy,
): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];
  const add = (
    key: keyof OperationalSnapshot,
    condition: boolean,
    severity: OperationalAlert['severity'],
    message: string,
  ) => {
    if (condition) alerts.push({ key, message, severity, value: snapshot[key] });
  };

  add(
    'availabilityPercent',
    snapshot.availabilityPercent < policy.minimumAvailabilityPercent,
    'critical',
    'Portal availability is below the production objective.',
  );
  add(
    'p95LatencyMs',
    snapshot.p95LatencyMs > policy.maximumP95LatencyMs,
    'warning',
    'Portal p95 latency exceeds the production objective.',
  );
  add(
    'queueOldestAgeMinutes',
    snapshot.queueOldestAgeMinutes > policy.maximumQueueAgeMinutes,
    'warning',
    'The oldest queued operation exceeds the processing objective.',
  );
  add(
    'deadLetterCount',
    snapshot.deadLetterCount > policy.maximumDeadLetterCount,
    'critical',
    'One or more dead-letter operations require intervention.',
  );
  add(
    'backupAgeHours',
    snapshot.backupAgeHours > policy.maximumBackupAgeHours,
    'critical',
    'The newest verified backup is too old.',
  );
  add(
    'paymentWebhookFailureCount',
    snapshot.paymentWebhookFailureCount > policy.maximumPaymentWebhookFailureCount,
    'critical',
    'Payment webhook failures require reconciliation.',
  );
  add(
    'supplierSyncFailureCount',
    snapshot.supplierSyncFailureCount > policy.maximumSupplierSyncFailureCount,
    'warning',
    'Supplier synchronization failures exceed the operating threshold.',
  );
  add(
    'notificationFailureCount',
    snapshot.notificationFailureCount > policy.maximumNotificationFailureCount,
    'warning',
    'Notification delivery failures exceed the operating threshold.',
  );

  return alerts;
}
