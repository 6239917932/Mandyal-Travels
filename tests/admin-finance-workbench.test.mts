import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  adminFinancePath,
  canOperateOnPayment,
  financeWindowStart,
  normalizeAdminFinanceFilters,
  privateProviderReference,
  redactFinanceNarrative,
  refundReviewPosture,
} from '../services/adminFinanceWorkbenchService.ts';

test('finance filters accept only bounded closed-catalogue values', () => {
  assert.deepEqual(
    normalizeAdminFinanceFilters({
      paymentPage: '2',
      paymentStatus: 'captured',
      q: '  booking   reference ',
      reconciliation: 'discrepancy',
      refundPage: '3',
      refundStatus: 'approved',
      window: '90',
    }),
    {
      paymentPage: 2,
      paymentStatus: 'captured',
      query: 'booking reference',
      reconciliation: 'DISCREPANCY',
      refundPage: 3,
      refundStatus: 'APPROVED',
      window: '90',
    },
  );
  assert.deepEqual(normalizeAdminFinanceFilters({ paymentStatus: 'paid', window: '365' }), {
    paymentPage: 1,
    paymentStatus: 'ALL',
    query: '',
    reconciliation: 'ALL',
    refundPage: 1,
    refundStatus: 'PENDING',
    window: '30',
  });
});

test('finance pagination preserves independent payment and refund positions', () => {
  const filters = normalizeAdminFinanceFilters({
    paymentPage: '4',
    q: 'MT-2026',
    refundPage: '2',
    refundStatus: 'ALL',
  });
  assert.equal(
    adminFinancePath(filters, { paymentPage: 3 }),
    '/admin/finance?paymentPage=3&refundPage=2&q=MT-2026&refundStatus=ALL',
  );
  assert.equal(
    adminFinancePath(filters, { refundPage: 1 }),
    '/admin/finance?paymentPage=4&refundPage=1&q=MT-2026&refundStatus=ALL',
  );
});

test('finance presentation protects provider and narrative identifiers', () => {
  const reference = privateProviderReference('fixture', 'provider-secret-123');
  assert.equal(reference.length, 12);
  assert.equal(reference, privateProviderReference('fixture', 'provider-secret-123'));
  assert.ok(!reference.includes('SECRET'));
  assert.equal(
    redactFinanceNarrative('Asked by guest@example.com from 10.1.2.3 ref 9876543210'),
    'Asked by [email redacted] from [network address redacted] ref [identifier redacted]',
  );
});

test('finance safety posture restricts mutations and classifies refund work', () => {
  assert.equal(canOperateOnPayment('captured'), true);
  assert.equal(canOperateOnPayment('pending'), false);
  assert.equal(refundReviewPosture('PENDING'), 'REVIEW_REQUIRED');
  assert.equal(refundReviewPosture('PROVIDER_FAILED'), 'RETRY_AVAILABLE');
  assert.equal(refundReviewPosture('PROCESSING'), 'IN_PROGRESS');
  assert.equal(refundReviewPosture('APPROVED'), 'REVIEWED');
  assert.equal(
    financeWindowStart('30', new Date('2026-08-24T12:00:00.000Z'))?.toISOString(),
    '2026-07-25T12:00:00.000Z',
  );
  assert.equal(financeWindowStart('ALL', new Date()), null);
});

test('payment reconciliation route rejects non-captured transactions', () => {
  const route = readFileSync('app/api/v1/admin/finance/payments/[paymentId]/route.ts', 'utf8');
  assert.match(route, /current\.status !== 'captured'/);
  assert.match(route, /Only captured payments can be reconciled\./);
});
