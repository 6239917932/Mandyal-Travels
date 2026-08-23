import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adminFlightOperationPath,
  flightOperationPosture,
  hasOperationEvidence,
  normalizeAdminFlightOperationFilters,
} from '../services/adminFlightOperationLedgerService.ts';

test('flight operation filters accept only bounded closed-catalogue values', () => {
  assert.deepEqual(
    normalizeAdminFlightOperationFilters({
      environment: 'sandbox',
      page: '4',
      q: `  ${'supplier '.repeat(20)}  `,
      status: 'dead_letter',
    }),
    {
      environment: 'SANDBOX',
      page: 4,
      query: 'supplier '.repeat(20).trim().slice(0, 100),
      status: 'DEAD_LETTER',
    },
  );
  assert.deepEqual(
    normalizeAdminFlightOperationFilters({ environment: 'cashfree', page: '0', status: 'unsafe' }),
    { environment: 'ALL', page: 1, query: '', status: 'ALL' },
  );
});

test('flight operation posture distinguishes expected queues from actionable failures', () => {
  assert.equal(flightOperationPosture('QUEUED', 0), 'AWAITING_PROVIDER_ACTIVATION');
  assert.equal(flightOperationPosture('QUEUED', 2), 'RETRY_QUEUED');
  assert.equal(flightOperationPosture('PROCESSING', 1), 'IN_PROGRESS');
  assert.equal(flightOperationPosture('COMPLETED', 1), 'COMPLETED');
  assert.equal(flightOperationPosture('FAILED', 3), 'NEEDS_ATTENTION');
  assert.equal(flightOperationPosture('DEAD_LETTER', 8), 'NEEDS_ATTENTION');
});

test('provider references and error details are reduced to evidence presence', () => {
  const providerReference = 'provider-private-operation-123';
  assert.equal(hasOperationEvidence(providerReference), true);
  assert.equal(hasOperationEvidence('  '), false);
  assert.equal(typeof hasOperationEvidence(providerReference), 'boolean');
});

test('flight operation pagination preserves normalized filters', () => {
  const filters = normalizeAdminFlightOperationFilters({
    environment: 'production',
    q: 'Air supplier',
    status: 'failed',
  });
  assert.equal(
    adminFlightOperationPath(filters, 2),
    '/admin/integrations/flights?page=2&q=Air+supplier&status=FAILED&environment=PRODUCTION',
  );
});
