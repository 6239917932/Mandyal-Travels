import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  adminNotificationPath,
  hasNotificationErrorEvidence,
  normalizeAdminNotificationFilters,
  notificationDeliveryPosture,
  notificationWindowStart,
  privateRecipientReference,
} from '../services/adminNotificationOperationsService.ts';

test('notification operations filters accept only bounded supported values', () => {
  assert.deepEqual(
    normalizeAdminNotificationFilters({
      channel: 'email',
      page: '3',
      q: '  HOTEL   CONFIRMED ',
      status: 'failed',
      window: '90',
    }),
    { channel: 'EMAIL', page: 3, query: 'HOTEL CONFIRMED', status: 'FAILED', window: '90' },
  );
  assert.deepEqual(
    normalizeAdminNotificationFilters({
      channel: 'FAX',
      page: '-4',
      status: 'SENT',
      window: '365',
    }),
    { channel: 'ALL', page: 1, query: '', status: 'ALL', window: '30' },
  );
});

test('notification posture distinguishes delivery, retry, schedule, and stale processing states', () => {
  const now = new Date('2026-08-24T12:00:00.000Z');
  const base = { attempts: 1, maxAttempts: 6, now, updatedAt: now };
  assert.equal(
    notificationDeliveryPosture({ ...base, nextAttemptAt: now, status: 'DELIVERED' }),
    'DELIVERED',
  );
  assert.equal(
    notificationDeliveryPosture({ ...base, nextAttemptAt: now, status: 'FAILED' }),
    'RETRY_AVAILABLE',
  );
  assert.equal(
    notificationDeliveryPosture({
      ...base,
      nextAttemptAt: new Date('2026-08-24T13:00:00.000Z'),
      status: 'QUEUED',
    }),
    'SCHEDULED',
  );
  assert.equal(
    notificationDeliveryPosture({
      ...base,
      nextAttemptAt: now,
      status: 'PROCESSING',
      updatedAt: new Date('2026-08-24T11:44:00.000Z'),
    }),
    'STALE_PROCESSING',
  );
});

test('notification recipients stay private while error evidence remains visible', () => {
  const reference = privateRecipientReference('EMAIL', 'jasveer_singh@mandyaltravels.com');
  assert.equal(reference.length, 12);
  assert.equal(reference, privateRecipientReference('EMAIL', 'jasveer_singh@mandyaltravels.com'));
  assert.ok(!reference.includes('JASVEER'));
  assert.equal(hasNotificationErrorEvidence('PROVIDER_TIMEOUT'), true);
  assert.equal(hasNotificationErrorEvidence('   '), false);
  const retryRoute = readFileSync(
    new URL('../app/api/v1/admin/notifications/deliveries/[deliveryId]/route.ts', import.meta.url),
    'utf8',
  );
  assert.match(retryRoute, /notificationDelivery\.updateMany/);
  assert.match(retryRoute, /data: \{ id: delivery\.id, nextAttemptAt, status: 'QUEUED' \}/);
  assert.doesNotMatch(retryRoute, /data: await prisma\.notificationDelivery\.update/);
});

test('notification window and pagination paths preserve normalized filters', () => {
  const now = new Date('2026-08-24T12:00:00.000Z');
  assert.equal(notificationWindowStart('7', now)?.toISOString(), '2026-08-17T12:00:00.000Z');
  assert.equal(notificationWindowStart('ALL', now), null);
  assert.equal(
    adminNotificationPath(
      { channel: 'SMS', page: 4, query: 'reminder', status: 'QUEUED', window: '90' },
      2,
    ),
    '/admin/notifications?page=2&q=reminder&status=QUEUED&channel=SMS&window=90',
  );
});
