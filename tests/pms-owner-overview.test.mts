import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  allocateBookingValueForDate,
  buildOwnerSourceMix,
  calculateOwnerDailyPerformance,
  calculateOwnerFinancialTotals,
  stayOverlapsBusinessDate,
} from '../lib/pms/ownerOverview.ts';

const booking = {
  checkInDate: '2026-09-06',
  checkOutDate: '2026-09-09',
  currency: 'INR',
  entries: [],
  onlinePayment: { amount: 400, status: 'captured' },
  onlineRefunds: [],
  rooms: 2,
  source: 'DIRECT_DESK',
  totalAmount: 1_000,
} as const;

test('owner performance allocates the full booking value deterministically across nights', () => {
  assert.equal(allocateBookingValueForDate({ ...booking, businessDate: '2026-09-05' }), 0);
  assert.equal(allocateBookingValueForDate({ ...booking, businessDate: '2026-09-06' }), 334);
  assert.equal(allocateBookingValueForDate({ ...booking, businessDate: '2026-09-07' }), 333);
  assert.equal(allocateBookingValueForDate({ ...booking, businessDate: '2026-09-08' }), 333);
  assert.equal(allocateBookingValueForDate({ ...booking, businessDate: '2026-09-09' }), 0);
  assert.equal(
    allocateBookingValueForDate({
      ...booking,
      businessDate: '2026-02-30',
    }),
    0,
  );
  assert.equal(stayOverlapsBusinessDate('2026-09-06', '2026-09-09', '2026-09-08'), true);
});

test('owner performance derives occupancy, ADR and RevPAR from active physical rooms', () => {
  assert.deepEqual(
    calculateOwnerDailyPerformance({
      activeRooms: 4,
      bookings: [booking],
      businessDate: '2026-09-07',
    }),
    {
      activeRooms: 4,
      adr: 167,
      bookedAccommodationValue: 333,
      occupancyPercent: 50,
      revPar: 83,
      roomsSold: 2,
    },
  );
});

test('owner financial totals honor append-only payments, refunds and reversals', () => {
  assert.deepEqual(
    calculateOwnerFinancialTotals([
      {
        ...booking,
        entries: [
          { amount: 200, entryType: 'CHARGE' },
          { amount: 500, entryType: 'PAYMENT' },
          { amount: 100, entryType: 'REVERSAL', reversalOfType: 'CHARGE' },
        ],
        onlineRefunds: [{ amount: 50, status: 'APPROVED' }],
      },
    ]),
    { charges: 1_100, collections: 850, creditBalances: 0, receivables: 250 },
  );
});

test('owner source mix groups stable normalized booking sources', () => {
  assert.deepEqual(buildOwnerSourceMix([booking, { ...booking, source: 'direct_desk' }]), [
    { bookedValue: 2_000, bookings: 2, source: 'DIRECT_DESK' },
  ]);
});

test('owner overview is property scoped, bounded and restricted to partner administrators', async () => {
  const [page, service, registry] = await Promise.all([
    readFile(new URL('../app/partner/pms/owner-overview/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../services/partnerOwnerOverviewService.ts', import.meta.url), 'utf8'),
    readFile(new URL('../lib/pms/moduleRegistry.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(page, /access\.memberRole !== 'ADMIN'/);
  assert.match(page, /Booked accommodation value/);
  assert.match(page, /not a GST invoice or accounting revenue\s+entry/);
  assert.match(service, /listingSource: 'MANAGED'/);
  assert.match(service, /partnerId, status: 'ACTIVE'/);
  assert.match(service, /input\.memberRole !== 'ADMIN'/);
  assert.match(service, /take: MAX_BOOKINGS \+ 1/);
  assert.match(service, /financialComplete: !safetyLimitReached/);
  assert.match(registry, /href: '\/partner\/pms\/owner-overview'/);
});
