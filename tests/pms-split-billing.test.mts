import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { calculateHotelFolioBalance, HotelFolioRuleError } from '../lib/pms/folio.ts';
import { buildHotelOperationalReport } from '../lib/pms/operationalReport.ts';
import { buildManagementProfitLoss } from '../lib/pms/profitLoss.ts';
import {
  normalizeHotelFolioDiscount,
  normalizeHotelSplitPaymentAllocations,
  requireExpectedFolioBalance,
} from '../lib/pms/splitBilling.ts';

test('discounts reduce folio charges and their append-only reversals restore them', () => {
  assert.deepEqual(
    calculateHotelFolioBalance({
      bookingTotalAmount: 5000,
      entries: [
        { amount: 500, category: 'DISCOUNT', entryType: 'CHARGE' },
        {
          amount: 200,
          category: 'DISCOUNT',
          entryType: 'REVERSAL',
          reversalOfType: 'CHARGE',
        },
      ],
    }),
    { approvedRefunds: 0, balance: 4700, charges: 4700, payments: 0 },
  );
});

test('discounts flow consistently into operational and management reporting', () => {
  const entries = [
    {
      amount: 500,
      businessDate: '2026-09-10',
      category: 'DISCOUNT',
      entryType: 'CHARGE',
    },
  ];
  const operational = buildHotelOperationalReport({
    bookings: [],
    closes: [],
    dates: ['2026-09-10'],
    folioEntries: entries,
    serviceOrders: [],
    shifts: [],
  });
  const management = buildManagementProfitLoss({
    bookings: [],
    dates: ['2026-09-10'],
    folioEntries: entries,
    postings: [],
  });
  assert.equal(operational.totals.folioCharges, -500);
  assert.equal(management.totals.supplementalCharges, -500);
  assert.equal(management.totals.operatingRevenue, -500);
});

test('discount inputs require a bounded whole amount and meaningful reason', () => {
  assert.deepEqual(normalizeHotelFolioDiscount({ amount: '750', reason: 'Loyalty approval' }), {
    amount: 750,
    reason: 'Loyalty approval',
  });
  assert.throws(
    () => normalizeHotelFolioDiscount({ amount: 0, reason: 'Loyalty approval' }),
    HotelFolioRuleError,
  );
  assert.throws(
    () => normalizeHotelFolioDiscount({ amount: 50, reason: 'short' }),
    HotelFolioRuleError,
  );
  assert.equal(requireExpectedFolioBalance('1250'), 1250);
});

test('split settlement normalizes two to four named payment allocations', () => {
  assert.deepEqual(
    normalizeHotelSplitPaymentAllocations([
      { amount: '600', category: 'cash', payer: 'Guest one' },
      { amount: 400, category: 'UPI', payer: 'Guest two' },
    ]),
    [
      { amount: 600, category: 'CASH', payer: 'Guest one' },
      { amount: 400, category: 'UPI', payer: 'Guest two' },
    ],
  );
  for (const value of [
    [{ amount: 100, category: 'CASH', payer: 'Solo' }],
    [
      { amount: 100, category: 'CASH', payer: 'A' },
      { amount: 100, category: 'CHEQUE', payer: 'Guest' },
    ],
  ]) {
    assert.throws(() => normalizeHotelSplitPaymentAllocations(value), HotelFolioRuleError);
  }
});

test('split billing endpoint is scoped, idempotent, atomic and audit recorded', async () => {
  const [route, service, page, controls, billingPage] = await Promise.all([
    readFile(
      new URL(
        '../app/api/v1/partner/bookings/[confirmationCode]/split-billing/route.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(new URL('../services/partnerSplitBillingService.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/partner/pms/split-billing/page.tsx', import.meta.url), 'utf8'),
    readFile(
      new URL('../components/partner/HotelSplitBillingControls.tsx', import.meta.url),
      'utf8',
    ),
    readFile(new URL('../app/partner/pms/billing/page.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(route, /isSameOriginMutation\(request\)/);
  assert.match(route, /access\.memberRole !== 'ADMIN'/);
  assert.match(service, /isolationLevel: 'Serializable'/);
  assert.match(service, /requestFingerprint/);
  assert.match(service, /expectedBalance/);
  assert.match(service, /HOTEL_FOLIO_DISCOUNT_APPLIED/);
  assert.match(service, /HOTEL_FOLIO_SPLIT_PAYMENT_POSTED/);
  assert.doesNotMatch(service, /hotelFolioEntry\.(update|delete)/);
  assert.match(page, /Split billing and discounts/i);
  assert.match(controls, /All allocations are posted\s*together/i);
  assert.match(billingPage, /\/partner\/pms\/split-billing/);
});
