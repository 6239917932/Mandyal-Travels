import assert from 'node:assert/strict';
import test from 'node:test';
import { notificationRetryAt, sanitizeDeliveryError } from '../lib/notifications/delivery.ts';
test('notification retries use bounded exponential delay', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  assert.equal(notificationRetryAt(0, now).toISOString(), '2026-01-01T00:01:00.000Z');
  assert.equal(notificationRetryAt(20, now).toISOString(), '2026-01-02T00:00:00.000Z');
});
test('notification errors are single-line and bounded', () => {
  assert.equal(sanitizeDeliveryError(new Error('provider\nfailed')), 'provider failed');
  assert.equal(sanitizeDeliveryError('x'.repeat(700)).length, 500);
});
