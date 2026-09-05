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
import {
  maskedPayoutDestination,
  normalizePayoutAccountReview,
} from '../services/partnerPayoutRules.ts';

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

test('payout destination reviews require a closed action, current version, and bounded reason', () => {
  assert.deepEqual(
    normalizePayoutAccountReview({
      action: ' verify ',
      expectedVersion: '3',
      reason: ' Provider micro-deposit verification completed. ',
    }),
    {
      action: 'VERIFY',
      expectedVersion: 3,
      reason: 'Provider micro-deposit verification completed.',
    },
  );
  assert.equal(
    normalizePayoutAccountReview({ action: 'APPROVE', expectedVersion: 1, reason: 'Long enough' }),
    null,
  );
  assert.equal(
    normalizePayoutAccountReview({ action: 'REJECT', expectedVersion: 0, reason: 'Long enough' }),
    null,
  );
});

test('supplier payout presentation exposes only masked destination details', () => {
  assert.deepEqual(
    maskedPayoutDestination({
      accountLast4: '4567',
      bankName: ' Example   Bank ',
      routingCodeMasked: 'IFSC ••••0123',
    }),
    {
      account: '•••• 4567',
      bankName: 'Example Bank',
      routingCodeMasked: 'IFSC ••••0123',
    },
  );
  assert.equal(
    maskedPayoutDestination({ accountLast4: '123456', bankName: '', routingCodeMasked: '' })
      .account,
    '•••• ••••',
  );
});

test('payout review routes are feature-gated, same-origin, stale-write protected, and audited', () => {
  const collectionRoute = readFileSync('app/api/v1/admin/finance/payout-accounts/route.ts', 'utf8');
  const reviewRoute = readFileSync(
    'app/api/v1/admin/finance/payout-accounts/[accountId]/route.ts',
    'utf8',
  );
  const service = readFileSync('services/partnerPayoutService.ts', 'utf8');
  const partnerPage = readFileSync('app/partner/settlements/page.tsx', 'utf8');
  assert.match(collectionRoute, /isSameOriginMutation\(request\)/);
  assert.match(collectionRoute, /PARTNER_PAYOUT_ONBOARDING/);
  assert.match(reviewRoute, /isSameOriginMutation\(request\)/);
  assert.match(reviewRoute, /normalizePayoutAccountReview/);
  assert.match(reviewRoute, /PARTNER_PAYOUT_ONBOARDING/);
  assert.match(service, /status: 'PENDING_VERIFICATION'/);
  assert.match(service, /version: input\.expectedVersion/);
  assert.match(service, /partnerPayoutAccountEvent\.create/);
  assert.match(service, /SUPERSEDED_DEFAULT/);
  assert.match(service, /payoutDestinationVersion: \{ increment: 1 \}/);
  assert.doesNotMatch(partnerPage, /providerBeneficiaryRef/);
  assert.doesNotMatch(partnerPage, /reviewReason/);
  assert.match(partnerPage, /Never send bank account numbers, UPI credentials, PINs, or OTPs/);
});
