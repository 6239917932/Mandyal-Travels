import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  calculateExpectedCash,
  calculateHotelFolioBalance,
  HotelFolioRuleError,
  hotelFolioRequestFingerprint,
  normalizeCashierOpeningAmount,
  normalizeFolioReversalReason,
  normalizeHotelFolioPosting,
  requireHotelFolioIdempotencyKey,
} from '../lib/pms/folio.ts';

test('folio postings normalize bounded charge and payment inputs', () => {
  assert.deepEqual(
    normalizeHotelFolioPosting({
      amount: '1250',
      category: 'room_service',
      description: '  Dinner   service ',
      entryType: 'charge',
    }),
    {
      amount: 1250,
      category: 'ROOM_SERVICE',
      description: 'Dinner service',
      entryType: 'CHARGE',
    },
  );
  assert.deepEqual(
    normalizeHotelFolioPosting({
      amount: 500,
      category: 'upi',
      description: 'Partial deposit',
      entryType: 'payment',
    }),
    {
      amount: 500,
      category: 'UPI',
      description: 'Partial deposit',
      entryType: 'PAYMENT',
    },
  );
});

test('folio rules reject decimals, zero postings, mismatched categories and weak descriptions', () => {
  for (const input of [
    { amount: 1.5, category: 'OTHER', description: 'Valid note', entryType: 'CHARGE' },
    { amount: 0, category: 'OTHER', description: 'Valid note', entryType: 'CHARGE' },
    { amount: 10, category: 'CASH', description: 'Valid note', entryType: 'CHARGE' },
    { amount: 10, category: 'OTHER', description: 'x', entryType: 'CHARGE' },
  ]) {
    assert.throws(() => normalizeHotelFolioPosting(input), HotelFolioRuleError);
  }
  assert.equal(normalizeCashierOpeningAmount('0'), 0);
});

test('balance includes the booking charge, captured payment and append-only corrections', () => {
  assert.deepEqual(
    calculateHotelFolioBalance({
      bookingTotalAmount: 5000,
      entries: [
        { amount: 700, entryType: 'CHARGE' },
        { amount: 2000, entryType: 'PAYMENT' },
        { amount: 100, entryType: 'REVERSAL', reversalOfType: 'CHARGE' },
        { amount: 250, entryType: 'REVERSAL', reversalOfType: 'PAYMENT' },
      ],
      onlinePayment: { amount: 1000, status: 'captured' },
      onlineRefunds: [
        { amount: 200, status: 'APPROVED' },
        { amount: 100, status: 'PENDING' },
      ],
    }),
    { approvedRefunds: 200, balance: 3050, charges: 5600, payments: 2550 },
  );
});

test('cashier reconciliation counts only cash payments and their reversals', () => {
  assert.equal(
    calculateExpectedCash({
      entries: [
        { amount: 1000, category: 'CASH', entryType: 'PAYMENT' },
        { amount: 500, category: 'UPI', entryType: 'PAYMENT' },
        { amount: 200, category: 'CASH', entryType: 'REVERSAL', reversalOfType: 'PAYMENT' },
        { amount: 300, category: 'CASH', entryType: 'CHARGE' },
      ],
      openingFloatAmount: 250,
    }),
    1050,
  );
});

test('retries and reversals require strong bounded identifiers and reasons', () => {
  const key = '12345678-1234-4234-8234-123456789abc';
  assert.equal(requireHotelFolioIdempotencyKey(key), key);
  assert.equal(normalizeFolioReversalReason('  Duplicate   posting  '), 'Duplicate posting');
  assert.throws(() => requireHotelFolioIdempotencyKey('short'), HotelFolioRuleError);
  assert.throws(() => normalizeFolioReversalReason('mistake'), HotelFolioRuleError);
  assert.equal(hotelFolioRequestFingerprint({ key }), hotelFolioRequestFingerprint({ key }));
});

test('folio and cashier mutations are scoped, same-origin, idempotent and audited', async () => {
  const [entryRoute, shiftRoute, service, checkoutService, page, bookingsPage] = await Promise.all([
    readFile(
      new URL(
        '../app/api/v1/partner/bookings/[confirmationCode]/folio-entries/route.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(new URL('../app/api/v1/partner/cashier-shifts/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../services/partnerHotelFolioService.ts', import.meta.url), 'utf8'),
    readFile(new URL('../services/partnerOperationsService.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/partner/pms/billing/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/partner/bookings/page.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(entryRoute, /isSameOriginMutation\(request\)/);
  assert.match(entryRoute, /access\.memberRole !== 'ADMIN'/);
  assert.match(shiftRoute, /access\.memberRole !== 'ADMIN'/);
  assert.match(service, /listingSource: 'MANAGED'/);
  assert.match(service, /partnerId: input\.partnerId/);
  assert.match(service, /requestFingerprint/);
  assert.match(service, /isolationLevel: 'Serializable'/);
  assert.match(service, /HOTEL_CASHIER_SHIFT_OPENED/);
  assert.match(service, /HOTEL_FOLIO_ENTRY_REVERSED/);
  assert.doesNotMatch(service, /hotelFolioEntry\.(update|delete)/);
  assert.match(checkoutService, /assertHotelFolioSettledForCheckout/);
  assert.match(page, /append-only audit trail/i);
  assert.match(page, /not a GST tax invoice/i);
  assert.match(bookingsPage, /\/partner\/pms\/billing\?booking=/);
});

test('folio schema preserves immutable history and one active cashier shift per actor', async () => {
  const [schema, sqliteMigration, postgresMigration] = await Promise.all([
    readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8'),
    readFile(
      new URL(
        '../prisma/migrations/20260907193000_add_hotel_folios_and_cashier_shifts/migration.sql',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../prisma/postgresql/migrations/20260907193000_add_hotel_folios_and_cashier_shifts/migration.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);
  assert.match(schema, /model HotelCashierShift[\s\S]*activeKey\s+String\?\s+@unique/);
  assert.match(schema, /model HotelFolioEntry[\s\S]*idempotencyKey\s+String\s+@unique/);
  assert.match(schema, /reversalOfId\s+String\?\s+@unique/);
  assert.match(sqliteMigration, /ON DELETE RESTRICT/);
  assert.match(postgresMigration, /ON DELETE RESTRICT/);
  assert.match(postgresMigration, /HotelCashierShift_activeKey_key/);
  assert.match(postgresMigration, /HotelFolioEntry_idempotencyKey_key/);
});
