import assert from 'node:assert/strict';
import test from 'node:test';

import { outboxRetryDecision, safeOutboxError } from '../lib/integrations/outbox.ts';

test('integration retries use bounded exponential backoff', () => {
  const now = new Date('2026-08-15T10:00:00.000Z');
  assert.equal(
    outboxRetryDecision({ attempts: 0, maxAttempts: 8, now }).nextAttemptAt.toISOString(),
    '2026-08-15T10:01:00.000Z',
  );
  assert.equal(
    outboxRetryDecision({ attempts: 7, maxAttempts: 20, now }).nextAttemptAt.toISOString(),
    '2026-08-15T12:08:00.000Z',
  );
  assert.equal(
    outboxRetryDecision({ attempts: 15, maxAttempts: 20, now }).nextAttemptAt.toISOString(),
    '2026-08-15T16:00:00.000Z',
  );
});

test('exhausted events move to the dead-letter state', () => {
  const now = new Date('2026-08-15T10:00:00.000Z');
  assert.deepEqual(outboxRetryDecision({ attempts: 7, maxAttempts: 8, now }), {
    nextAttemptAt: now,
    status: 'DEAD_LETTER',
  });
});

test('integration errors are single-line and bounded', () => {
  const cleaned = safeOutboxError(new Error(`Provider\nrejected\trequest ${'x'.repeat(600)}`));
  assert.equal(cleaned.includes('\n'), false);
  assert.equal(cleaned.length, 500);
});
