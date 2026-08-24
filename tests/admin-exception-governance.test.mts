import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  adminExceptionPath,
  exceptionWindowStart,
  hasIntegrationErrorEvidence,
  integrationQueuePosture,
  normalizeAdminExceptionFilters,
  normalizeIntegrationReviewAction,
  privateAggregateReference,
} from '../services/adminExceptionWorkbenchService.ts';

test('exception filters are closed, bounded, and preserve pagination', () => {
  const filters = normalizeAdminExceptionFilters({
    page: '3',
    q: '  HOTEL   BOOKING  ',
    status: 'dead_letter',
    window: '90',
  });
  assert.deepEqual(filters, {
    page: 3,
    query: 'HOTEL BOOKING',
    status: 'DEAD_LETTER',
    window: '90',
  });
  assert.equal(
    adminExceptionPath(filters, 2),
    '/admin/operations?page=2&q=HOTEL+BOOKING&status=DEAD_LETTER&window=90',
  );
  assert.deepEqual(normalizeAdminExceptionFilters({ status: 'DELETE', window: '365' }), {
    page: 1,
    query: '',
    status: 'ACTION_REQUIRED',
    window: '30',
  });
});

test('exception windows and queue posture are deterministic', () => {
  const now = new Date('2026-08-24T12:00:00.000Z');
  assert.equal(exceptionWindowStart('30', now)?.toISOString(), '2026-07-25T12:00:00.000Z');
  assert.equal(exceptionWindowStart('ALL', now), null);
  assert.equal(integrationQueuePosture('PENDING', 0), 'QUEUED');
  assert.equal(integrationQueuePosture('PENDING', 2), 'RETRY_SCHEDULED');
  assert.equal(integrationQueuePosture('DEAD_LETTER', 8), 'HUMAN_REVIEW');
  assert.equal(integrationQueuePosture('PROCESSING', 1), 'IN_PROGRESS');
  assert.equal(integrationQueuePosture('DELIVERED', 1), 'CLOSED');
});

test('integration evidence presentation protects raw operational data', () => {
  const reference = privateAggregateReference('BOOKING', 'jasveer_singh@mandyaltravels.com');
  assert.equal(reference.length, 12);
  assert.equal(reference, privateAggregateReference('BOOKING', 'jasveer_singh@mandyaltravels.com'));
  assert.ok(!reference.includes('JASVEER'));
  assert.equal(hasIntegrationErrorEvidence(' provider secret rejected '), true);
  assert.equal(hasIntegrationErrorEvidence('   '), false);
});

test('integration review actions require a bounded note and exact event version', () => {
  assert.deepEqual(
    normalizeIntegrationReviewAction({
      action: 'RETRY',
      expectedUpdatedAt: '2026-08-24T12:00:00.000Z',
      note: '  Provider recovered after manual review.  ',
    }),
    {
      action: 'RETRY',
      expectedUpdatedAt: new Date('2026-08-24T12:00:00.000Z'),
      note: 'Provider recovered after manual review.',
    },
  );
  assert.equal(
    normalizeIntegrationReviewAction({
      action: 'IGNORE',
      expectedUpdatedAt: 'not-a-date',
      note: 'valid note',
    }),
    null,
  );
  assert.equal(
    normalizeIntegrationReviewAction({
      action: 'DELETE',
      expectedUpdatedAt: '2026-08-24T12:00:00.000Z',
      note: 'valid note',
    }),
    null,
  );
});

test('administrator queue redacts errors and appends version-safe review history', async () => {
  const page = await readFile(new URL('../app/admin/operations/page.tsx', import.meta.url), 'utf8');
  const route = await readFile(
    new URL('../app/api/v1/admin/operations/integrations/[eventId]/route.ts', import.meta.url),
    'utf8',
  );
  assert.match(page, /hasIntegrationErrorEvidence\(event\.lastError\)/);
  assert.doesNotMatch(page, /\{event\.lastError\}/);
  assert.doesNotMatch(page, /\{event\.aggregateId\}/);
  assert.match(route, /integrationOutboxEvent\.updateMany/);
  assert.match(route, /integrationOutboxReviewEvent\.create/);
  assert.match(route, /updatedAt: review\.expectedUpdatedAt/);
});
