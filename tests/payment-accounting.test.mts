import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertBalancedJournal,
  createCaptureAccounting,
  createRefundPostings,
  prorateCaptureAllocations,
} from '../lib/payments/accounting.ts';
import { reconciliationMatchesPayment } from '../services/adminFinanceService.ts';

test('capture accounting allocates the exact captured amount and balances', () => {
  const result = createCaptureAccounting({
    amount: 11_800,
    commissionBasisPoints: 1_000,
    partnerId: 'partner-1',
    taxAmount: 1_800,
  });
  assert.equal(
    result.allocations.reduce((total, allocation) => total + allocation.amount, 0),
    11_800,
  );
  assert.deepEqual(
    Object.fromEntries(result.allocations.map((item) => [item.allocationType, item.amount])),
    {
      PLATFORM_COMMISSION: 1_000,
      SUPPLIER_PAYABLE: 9_000,
      TAX_PAYABLE: 1_800,
    },
  );
  assert.doesNotThrow(() => assertBalancedJournal(result.postings));
});

test('capture accounting rejects invalid money and commission inputs', () => {
  assert.throws(() =>
    createCaptureAccounting({ amount: 100, commissionBasisPoints: 10_001, taxAmount: 0 }),
  );
  assert.throws(() =>
    createCaptureAccounting({ amount: 100, commissionBasisPoints: 1_000, taxAmount: 101 }),
  );
  assert.throws(() =>
    createCaptureAccounting({ amount: 100.5, commissionBasisPoints: 1_000, taxAmount: 0 }),
  );
});

test('refund accounting produces a balanced reversal obligation', () => {
  const postings = createRefundPostings(2_500);
  assert.doesNotThrow(() => assertBalancedJournal(postings));
  assert.equal(postings.find((posting) => posting.direction === 'DEBIT')?.amount, 2_500);
  assert.equal(postings.find((posting) => posting.direction === 'CREDIT')?.amount, 2_500);
});

test('journal assertion rejects unbalanced postings', () => {
  assert.throws(() =>
    assertBalancedJournal([
      { accountCode: 'A', amount: 100, description: 'Debit', direction: 'DEBIT' },
      { accountCode: 'B', amount: 99, description: 'Credit', direction: 'CREDIT' },
    ]),
  );
});

test('matched reconciliation requires exact provider money', () => {
  assert.equal(
    reconciliationMatchesPayment({
      paymentAmount: 11_800,
      paymentCurrency: 'INR',
      providerAmount: 11_800,
      providerCurrency: 'inr',
    }),
    true,
  );
  assert.equal(
    reconciliationMatchesPayment({
      paymentAmount: 11_800,
      paymentCurrency: 'INR',
      providerAmount: 11_799,
      providerCurrency: 'INR',
    }),
    false,
  );
  assert.equal(
    reconciliationMatchesPayment({
      paymentAmount: 11_800,
      paymentCurrency: 'INR',
      providerAmount: 11_800,
      providerCurrency: 'USD',
    }),
    false,
  );
});

test('approved refunds reduce settlement allocations and preserve the exact remainder', () => {
  assert.deepEqual(
    prorateCaptureAllocations({
      capturedAmount: 11_800,
      commissionAmount: 1_000,
      refundedAmount: 2_950,
      taxAmount: 1_800,
    }),
    { commissionAmount: 750, grossAmount: 8_850, supplierAmount: 6_750, taxAmount: 1_350 },
  );
  assert.deepEqual(
    prorateCaptureAllocations({
      capturedAmount: 11_800,
      commissionAmount: 1_000,
      refundedAmount: 11_800,
      taxAmount: 1_800,
    }),
    { commissionAmount: 0, grossAmount: 0, supplierAmount: 0, taxAmount: 0 },
  );
});
