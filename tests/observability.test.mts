import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createOperationalEvent,
  evaluateOperationalAlerts,
} from '../lib/observability/operations.ts';

test('structured operational events are bounded and omit unsafe identifiers', () => {
  const event = createOperationalEvent(
    {
      actorId: 'email@example.com secret',
      correlationId: 'booking:2026-0001',
      durationMs: 124.6,
      event: 'health.readiness.failed',
      result: 'failure',
      severity: 'error',
    },
    { environment: 'production', release: 'abc123', timestamp: new Date('2026-08-21T00:00:00Z') },
  );

  assert.equal(event.actorId, undefined);
  assert.equal(event.correlationId, 'booking:2026-0001');
  assert.equal(event.durationMs, 125);
  assert.equal(event.timestamp, '2026-08-21T00:00:00.000Z');
  assert.doesNotMatch(JSON.stringify(event), /email@example\.com|secret/);
});

test('alert policy identifies production readiness failures', () => {
  const alerts = evaluateOperationalAlerts({
    availabilityPercent: 99.5,
    backupAgeHours: 30,
    deadLetterCount: 1,
    notificationFailureCount: 0,
    paymentWebhookFailureCount: 0,
    p95LatencyMs: 900,
    queueOldestAgeMinutes: 2,
    supplierSyncFailureCount: 0,
  });

  assert.deepEqual(
    alerts.map((alert) => alert.key),
    ['availabilityPercent', 'deadLetterCount', 'backupAgeHours'],
  );
});
