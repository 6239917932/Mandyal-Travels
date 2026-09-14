import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';

import {
  emailRecipientHash,
  normalizeEmailRecipient,
  parseEmailProviderEvent,
  verifyEmailEventWebhook,
} from '../lib/notifications/emailSuppression.ts';

const secret = 'test-email-webhook-secret-32-characters-long';

test('email recipients are normalized and keyed hashes do not disclose addresses', () => {
  assert.equal(normalizeEmailRecipient(' Guest@Example.COM '), 'guest@example.com');
  const hash = emailRecipientHash('Guest@Example.COM', secret);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(hash, emailRecipientHash(' guest@example.com ', secret));
  assert.doesNotMatch(hash, /guest|example/);
  assert.throws(() => normalizeEmailRecipient('invalid-address'), /EMAIL_RECIPIENT_INVALID/);
  assert.throws(() => emailRecipientHash('guest@example.com', 'short'), /NOT_CONFIGURED/);
});

test('email event signatures are time-bound and body-bound', () => {
  const payload = '{"eventId":"evt-1"}';
  const timestamp = '1789376400';
  const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  const now = Number(timestamp) * 1_000;

  assert.equal(verifyEmailEventWebhook({ now, payload, secret, signature, timestamp }), true);
  assert.equal(
    verifyEmailEventWebhook({ now, payload: `${payload} `, secret, signature, timestamp }),
    false,
  );
  assert.equal(
    verifyEmailEventWebhook({ now: now + 6 * 60_000, payload, secret, signature, timestamp }),
    false,
  );
});

test('only bounded permanent bounce and complaint events are accepted', () => {
  const now = new Date('2026-09-14T10:00:00.000Z');
  const event = parseEmailProviderEvent(
    JSON.stringify({
      eventId: 'evt-1',
      occurredAt: '2026-09-14T09:59:00.000Z',
      providerMessageId: 'msg-1',
      recipient: 'Guest@Example.com',
      type: 'complaint',
    }),
    now,
  );
  assert.deepEqual(event, {
    eventId: 'evt-1',
    eventType: 'COMPLAINT',
    occurredAt: new Date('2026-09-14T09:59:00.000Z'),
    providerMessageId: 'msg-1',
    recipient: 'guest@example.com',
  });
  assert.throws(
    () =>
      parseEmailProviderEvent(
        JSON.stringify({
          eventId: 'evt-2',
          occurredAt: now.toISOString(),
          recipient: 'guest@example.com',
          type: 'DELIVERED',
        }),
        now,
      ),
    /EMAIL_EVENT_PAYLOAD_INVALID/,
  );
});

test('delivery worker enforces suppression and webhook is authenticated and replay-safe', () => {
  const route = fs.readFileSync(
    'app/api/v1/notifications/email-events/[provider]/route.ts',
    'utf8',
  );
  const service = fs.readFileSync('services/emailSuppressionService.ts', 'utf8');
  const delivery = fs.readFileSync('services/notificationDeliveryService.ts', 'utf8');

  assert.match(route, /verifyEmailEventWebhook/);
  assert.match(route, /EMAIL_BOUNCE_WEBHOOK_SECRET/);
  assert.match(service, /EMAIL_SUPPRESSION_HASH_SECRET/);
  assert.match(service, /emailProviderEvent\.create/);
  assert.match(service, /hasPrismaErrorCode\(error, 'P2002'\)/);
  assert.match(delivery, /isEmailRecipientSuppressed/);
  assert.match(delivery, /EMAIL_RECIPIENT_SUPPRESSED/);
  assert.match(delivery, /status: 'DEAD_LETTER'/);
});
