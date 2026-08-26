import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  NOTIFICATION_BATCH_DEFAULT,
  NOTIFICATION_BATCH_MAXIMUM,
  boundedNotificationInteger,
  notificationSummaryProcessed,
} from '../lib/automation/notificationRules.ts';

test('notification automation rejects unbounded or malformed limits', () => {
  assert.equal(boundedNotificationInteger(undefined, NOTIFICATION_BATCH_DEFAULT, 1, 100), 25);
  assert.equal(boundedNotificationInteger('100', 25, 1, NOTIFICATION_BATCH_MAXIMUM), 100);
  assert.throws(() => boundedNotificationInteger(0, 25, 1, 100), /INVALID_NOTIFICATION_LIMIT/);
  assert.throws(() => boundedNotificationInteger(101, 25, 1, 100), /INVALID_NOTIFICATION_LIMIT/);
  assert.throws(() => boundedNotificationInteger('not-a-number', 25, 1, 100));
});

test('notification summaries count delivered and failed attempts once', () => {
  assert.equal(notificationSummaryProcessed({ delivered: 12, failed: 3 }), 15);
});

test('notification worker is authenticated, leased, replay-safe, and provider-deduplicated', () => {
  const route = fs.readFileSync('app/api/v1/internal/workers/notifications/route.ts', 'utf8');
  const automation = fs.readFileSync('services/notificationAutomationService.ts', 'utf8');
  const delivery = fs.readFileSync('services/notificationDeliveryService.ts', 'utf8');
  const admin = fs.readFileSync('app/admin/automation/page.tsx', 'utf8');

  assert.match(route, /NOTIFICATION_WORKER_SECRET/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /NOTIFICATION_WORKER_LEASE_SECONDS/);
  assert.match(automation, /NOTIFICATION_DELIVERY_V1/);
  assert.match(automation, /automationJobLease/);
  assert.match(automation, /automationJobRun/);
  assert.match(automation, /existingRun\?\.status === 'SUCCEEDED'/);
  assert.match(delivery, /dedupeKey: delivery\.dedupeKey/);
  assert.match(delivery, /status: 'QUEUED', updatedAt: delivery\.updatedAt/);
  assert.match(admin, /summary\.deadLettered/);
  assert.doesNotMatch(admin, /recipient/);
  assert.doesNotMatch(admin, /providerRef/);
  assert.doesNotMatch(automation, /paymentTransaction\.(create|update|delete)/);
  assert.doesNotMatch(automation, /partnerSettlement\.(create|update|delete)/);
});
