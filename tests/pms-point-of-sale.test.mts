import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  HotelPosRuleError,
  hotelPosFingerprint,
  nextHotelPosStatuses,
  normalizeHotelPosOrder,
  normalizeHotelPosTransition,
  parseStoredHotelPosItems,
  requireHotelPosIdempotencyKey,
} from '../lib/pms/pointOfSale.ts';

test('POS order normalization produces an exact bounded whole-INR total', () => {
  assert.deepEqual(
    normalizeHotelPosOrder({
      items: [
        { name: ' Masala   tea ', quantity: '2', unitPrice: '125' },
        { name: 'Sandwich', quantity: 1, unitPrice: 300 },
      ],
      note: ' No   onion ',
      outletName: ' Main   kitchen ',
      serviceMode: 'room_service',
    }),
    {
      items: [
        { name: 'Masala tea', quantity: 2, unitPrice: 125 },
        { name: 'Sandwich', quantity: 1, unitPrice: 300 },
      ],
      note: 'No onion',
      outletName: 'Main kitchen',
      serviceMode: 'ROOM_SERVICE',
      totalAmount: 550,
    },
  );
});

test('POS rules reject malformed, empty, fractional and oversized orders', () => {
  for (const input of [
    { items: [], outletName: 'Kitchen', serviceMode: 'ROOM_SERVICE' },
    {
      items: [{ name: 'Tea', quantity: 1.5, unitPrice: 100 }],
      outletName: 'Kitchen',
      serviceMode: 'ROOM_SERVICE',
    },
    {
      items: [{ name: 'Tea', quantity: 50, unitPrice: 500000 }],
      outletName: 'Kitchen',
      serviceMode: 'ROOM_SERVICE',
    },
  ]) {
    assert.throws(() => normalizeHotelPosOrder(input), HotelPosRuleError);
  }
  assert.deepEqual(parseStoredHotelPosItems('{broken'), []);
});

test('kitchen state machine prevents skips and requires a cancellation reason', () => {
  assert.deepEqual(nextHotelPosStatuses('PLACED'), ['ACCEPTED', 'CANCELLED']);
  assert.deepEqual(nextHotelPosStatuses('READY'), ['POSTED']);
  assert.deepEqual(nextHotelPosStatuses('POSTED'), []);
  assert.deepEqual(
    normalizeHotelPosTransition({ currentStatus: 'PREPARING', targetStatus: 'ready' }),
    { note: '', targetStatus: 'READY' },
  );
  assert.throws(
    () => normalizeHotelPosTransition({ currentStatus: 'PLACED', targetStatus: 'READY' }),
    HotelPosRuleError,
  );
  assert.throws(
    () =>
      normalizeHotelPosTransition({
        currentStatus: 'PLACED',
        note: 'No',
        targetStatus: 'CANCELLED',
      }),
    HotelPosRuleError,
  );
});

test('POS retry identifiers and request fingerprints are strong and deterministic', () => {
  const key = '12345678-1234-4234-8234-123456789abc';
  assert.equal(requireHotelPosIdempotencyKey(key), key);
  assert.throws(() => requireHotelPosIdempotencyKey('short'), HotelPosRuleError);
  assert.equal(hotelPosFingerprint({ order: 1 }), hotelPosFingerprint({ order: 1 }));
});

test('POS routes and service enforce origin, tenant scope, checked-in stays and atomic folio posting', async () => {
  const [createRoute, updateRoute, service, checkoutService, posPage, kitchenPage, registry] =
    await Promise.all([
      readFile(new URL('../app/api/v1/partner/pos-orders/route.ts', import.meta.url), 'utf8'),
      readFile(
        new URL('../app/api/v1/partner/pos-orders/[orderId]/route.ts', import.meta.url),
        'utf8',
      ),
      readFile(new URL('../services/partnerHotelPosService.ts', import.meta.url), 'utf8'),
      readFile(new URL('../services/partnerOperationsService.ts', import.meta.url), 'utf8'),
      readFile(new URL('../app/partner/pms/point-of-sale/page.tsx', import.meta.url), 'utf8'),
      readFile(new URL('../app/partner/pms/kitchen-display/page.tsx', import.meta.url), 'utf8'),
      readFile(new URL('../lib/pms/moduleRegistry.ts', import.meta.url), 'utf8'),
    ]);
  assert.match(createRoute, /isSameOriginMutation\(request\)/);
  assert.match(updateRoute, /isSameOriginMutation\(request\)/);
  assert.match(service, /listingSource: 'MANAGED'/);
  assert.match(service, /partnerId: input\.partnerId/);
  assert.match(service, /operationalStatus: 'CHECKED_IN'/);
  assert.match(service, /isolationLevel: 'Serializable'/);
  assert.match(service, /hotelFolioEntry\.create/);
  assert.match(service, /folioIdempotencyKey/);
  assert.match(service, /assertNoOpenHotelPosOrdersForCheckout/);
  assert.match(checkoutService, /assertNoOpenHotelPosOrdersForCheckout/);
  assert.match(service, /HOTEL_POS_ORDER_/);
  assert.doesNotMatch(service, /hotelPosOrder\.(delete|update)\(/);
  assert.match(posPage, /existing append-only guest folio/i);
  assert.match(kitchenPage, /same transaction/i);
  assert.match(registry, /href: '\/partner\/pms\/point-of-sale'/);
  assert.match(registry, /href: '\/partner\/pms\/kitchen-display'/);
});

test('POS schema preserves immutable events and restricts every financial relation', async () => {
  const [schema, sqliteMigration, postgresMigration] = await Promise.all([
    readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8'),
    readFile(
      new URL(
        '../prisma/migrations/20260907233000_add_hotel_pos_orders/migration.sql',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../prisma/postgresql/migrations/20260907233000_add_hotel_pos_orders/migration.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);
  assert.match(schema, /model HotelPosOrder/);
  assert.match(schema, /model HotelPosOrderEvent/);
  assert.match(schema, /createIdempotencyKey\s+String\s+@unique/);
  assert.match(schema, /@@unique\(\[orderId, version\]\)/);
  assert.match(sqliteMigration, /ON DELETE RESTRICT/);
  assert.match(postgresMigration, /ON DELETE RESTRICT/);
  assert.match(postgresMigration, /HotelPosOrderEvent_orderId_version_key/);
});
