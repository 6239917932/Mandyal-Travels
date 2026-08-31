import assert from 'node:assert/strict';
import test from 'node:test';
import {
  htmlToNotificationText,
  notificationRetryAt,
  notificationRetryDecision,
  parseNotificationVariables,
  renderNotificationTemplate,
  sanitizeDeliveryError,
} from '../lib/notifications/delivery.ts';
test('notification retries use bounded exponential delay', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  assert.equal(notificationRetryAt(0, now).toISOString(), '2026-01-01T00:01:00.000Z');
  assert.equal(notificationRetryAt(20, now).toISOString(), '2026-01-02T00:00:00.000Z');
});
test('notification errors are single-line and bounded', () => {
  assert.equal(sanitizeDeliveryError(new Error('provider\nfailed')), 'provider failed');
  assert.equal(sanitizeDeliveryError('x'.repeat(700)).length, 500);
});

test('notification variables accept only bounded scalar values', () => {
  assert.deepEqual(parseNotificationVariables('{"name":"Divya","nights":2,"paid":true}'), {
    name: 'Divya',
    nights: 2,
    paid: true,
  });
  assert.throws(() => parseNotificationVariables('[]'), /NOTIFICATION_VARIABLES_INVALID/);
  assert.throws(
    () => parseNotificationVariables('{"guest":{"name":"Divya"}}'),
    /NOTIFICATION_VARIABLE_VALUE_INVALID/,
  );
});

test('notification templates render required values and escape HTML variables', () => {
  const variables = { guest: '<Divya>', amount: 1500 };
  assert.equal(
    renderNotificationTemplate('Hello {{ guest }}, amount {{amount}}', variables),
    'Hello <Divya>, amount 1500',
  );
  assert.equal(
    renderNotificationTemplate('<strong>{{guest}}</strong>', variables, { escapeValues: true }),
    '<strong>&lt;Divya&gt;</strong>',
  );
  assert.throws(
    () => renderNotificationTemplate('Hello {{missing}}', variables),
    /NOTIFICATION_VARIABLE_MISSING:missing/,
  );
});

test('notification retry decisions dead-letter at the configured attempt limit', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  assert.deepEqual(notificationRetryDecision({ attempts: 1, maxAttempts: 3, now }), {
    attempts: 2,
    status: 'QUEUED',
    nextAttemptAt: new Date('2026-01-01T00:04:00Z'),
  });
  assert.deepEqual(notificationRetryDecision({ attempts: 2, maxAttempts: 3, now }), {
    attempts: 3,
    status: 'DEAD_LETTER',
    nextAttemptAt: now,
  });
});

test('notification email text removes markup', () => {
  assert.equal(htmlToNotificationText('<style>x</style><p>Hello <b>Divya</b></p>'), 'Hello Divya');
  assert.equal(
    htmlToNotificationText('<script>sendSecret()</script><p>Safe</p><style>hidden</style>'),
    'Safe',
  );
  assert.equal(
    htmlToNotificationText('Use 2 < 3 when explaining the fare'),
    'Use 2 < 3 when explaining the fare',
  );
});
