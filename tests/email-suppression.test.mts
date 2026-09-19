import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.ts';
import { storeEmailProviderEvent } from '../lib/notifications/emailSuppressionStore.ts';

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

test('email event signatures bind the provider, body, and timestamp', () => {
  const payload = '{"eventId":"evt-1"}';
  const provider = 'test-mail';
  const timestamp = '1789376400';
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${provider}.${payload}`)
    .digest('hex');
  const now = Number(timestamp) * 1_000;
  const signed = { now, payload, provider, secret, signature, timestamp };

  assert.equal(verifyEmailEventWebhook(signed), true);
  assert.equal(verifyEmailEventWebhook({ ...signed, provider: 'another-mail' }), false);
  assert.equal(verifyEmailEventWebhook({ ...signed, secret: 'short' }), false);
  assert.equal(verifyEmailEventWebhook({ ...signed, signature: 'invalid' }), false);
  assert.equal(verifyEmailEventWebhook({ ...signed, payload: `${payload} ` }), false);
  assert.equal(verifyEmailEventWebhook({ ...signed, now: now + 6 * 60_000 }), false);
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
  assert.match(service, /storeEmailProviderEvent/);
  assert.match(delivery, /isEmailRecipientSuppressed/);
  assert.match(delivery, /EMAIL_RECIPIENT_SUPPRESSED/);
  assert.match(delivery, /status: 'DEAD_LETTER'/);
});

test('email events persist atomically, reject conflicting replays, and preserve complaint history', async (t) => {
  const database = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: 'file::memory:' }) });
  t.after(async () => database.$disconnect());
  const migration = fs.readFileSync(
    'prisma/migrations/20260915110000_add_email_suppression_controls/migration.sql',
    'utf8',
  );
  for (const statement of migration.split(';').filter((value) => value.trim())) {
    await database.$executeRawUnsafe(statement);
  }
  const now = new Date('2026-09-20T10:00:00.000Z');
  const receive = (
    eventId: string,
    type: string,
    occurredAt: string,
    recipient = 'guest@example.com',
  ) => {
    const payload = JSON.stringify({ eventId, type, occurredAt, recipient });
    return storeEmailProviderEvent(database, {
      event: parseEmailProviderEvent(payload, now),
      payload,
      provider: 'test-mail',
      hashSecret: secret,
    });
  };
  assert.deepEqual(await receive('event-1', 'COMPLAINT', '2026-09-20T09:00:00.000Z'), {
    duplicate: false,
  });
  assert.deepEqual(await receive('event-1', 'COMPLAINT', '2026-09-20T09:00:00.000Z'), {
    duplicate: true,
  });
  await assert.rejects(
    receive('event-1', 'COMPLAINT', '2026-09-20T09:00:00.000Z', 'other@example.com'),
    /EMAIL_EVENT_ID_CONFLICT/,
  );
  await receive('event-2', 'BOUNCE', '2026-09-19T10:00:00.000Z');
  await receive('event-3', 'BOUNCE', '2026-09-20T09:30:00.000Z');
  const suppression = await database.emailSuppression.findUniqueOrThrow({
    where: { recipientHash: emailRecipientHash('guest@example.com', secret) },
  });
  assert.equal(suppression.eventCount, 3);
  assert.equal(suppression.reason, 'COMPLAINT');
  assert.equal(suppression.firstObservedAt.toISOString(), '2026-09-19T10:00:00.000Z');
  assert.equal(suppression.lastObservedAt.toISOString(), '2026-09-20T09:30:00.000Z');
  assert.equal(await database.emailSuppression.count(), 1);
  assert.equal(await database.emailProviderEvent.count(), 3);

  await database.$executeRawUnsafe(`CREATE TRIGGER reject_suppression_update
    BEFORE UPDATE ON "EmailSuppression" BEGIN SELECT RAISE(ABORT, 'test rollback'); END`);
  await assert.rejects(receive('event-4', 'BOUNCE', '2026-09-20T09:45:00.000Z'));
  assert.equal(
    await database.emailProviderEvent.count(),
    3,
    'failed suppression must roll back its event',
  );
});
