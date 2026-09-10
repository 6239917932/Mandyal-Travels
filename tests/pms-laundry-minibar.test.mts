import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  HotelPosRuleError,
  nextHotelGuestServiceStatuses,
  normalizeHotelGuestServiceOrder,
  normalizeHotelGuestServiceTransition,
} from '../lib/pms/pointOfSale.ts';

test('laundry, minibar and spa orders normalize bounded itemized whole-INR totals', () => {
  assert.deepEqual(
    normalizeHotelGuestServiceOrder({
      items: [
        { name: ' Shirt   wash ', quantity: '3', unitPrice: '80' },
        { name: 'Pressing', quantity: 1, unitPrice: 60 },
      ],
      note: ' Same-day   service ',
      outletName: ' Hotel   laundry ',
      serviceMode: 'laundry',
    }),
    {
      items: [
        { name: 'Shirt wash', quantity: 3, unitPrice: 80 },
        { name: 'Pressing', quantity: 1, unitPrice: 60 },
      ],
      note: 'Same-day service',
      outletName: 'Hotel laundry',
      serviceMode: 'LAUNDRY',
      totalAmount: 300,
    },
  );
  assert.equal(
    normalizeHotelGuestServiceOrder({
      items: [{ name: 'Massage', quantity: 1, unitPrice: 2500 }],
      outletName: 'Wellness desk',
      serviceMode: 'spa',
    }).serviceMode,
    'SPA',
  );
  assert.throws(
    () =>
      normalizeHotelGuestServiceOrder({
        items: [{ name: 'Tea', quantity: 1, unitPrice: 100 }],
        outletName: 'Kitchen',
        serviceMode: 'ROOM_SERVICE',
      }),
    HotelPosRuleError,
  );
});

test('laundry, minibar and spa use controlled state machines', () => {
  assert.deepEqual(nextHotelGuestServiceStatuses('LAUNDRY', 'ACCEPTED'), [
    'PREPARING',
    'CANCELLED',
  ]);
  assert.deepEqual(nextHotelGuestServiceStatuses('LAUNDRY', 'READY'), ['POSTED']);
  assert.deepEqual(nextHotelGuestServiceStatuses('MINIBAR', 'ACCEPTED'), ['POSTED', 'CANCELLED']);
  assert.deepEqual(nextHotelGuestServiceStatuses('MINIBAR', 'PREPARING'), []);
  assert.deepEqual(nextHotelGuestServiceStatuses('SPA', 'ACCEPTED'), ['PREPARING', 'CANCELLED']);
  assert.deepEqual(nextHotelGuestServiceStatuses('SPA', 'READY'), ['POSTED']);
  assert.deepEqual(
    normalizeHotelGuestServiceTransition({
      currentStatus: 'ACCEPTED',
      serviceMode: 'MINIBAR',
      targetStatus: 'POSTED',
    }),
    { note: '', targetStatus: 'POSTED' },
  );
  assert.throws(
    () =>
      normalizeHotelGuestServiceTransition({
        currentStatus: 'PLACED',
        note: 'No',
        serviceMode: 'LAUNDRY',
        targetStatus: 'CANCELLED',
      }),
    HotelPosRuleError,
  );
});

test('guest-service routes enforce origin and hotel-partner authentication', async () => {
  const [createRoute, transitionRoute] = await Promise.all([
    readFile(
      new URL('../app/api/v1/partner/guest-service-orders/route.ts', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../app/api/v1/partner/guest-service-orders/[orderId]/route.ts', import.meta.url),
      'utf8',
    ),
  ]);
  for (const route of [createRoute, transitionRoute]) {
    assert.match(route, /isSameOriginMutation\(request\)/);
    assert.match(route, /access\.partnerType !== 'HOTEL'/);
  }
  assert.match(createRoute, /createPartnerHotelGuestServiceOrder/);
  assert.match(transitionRoute, /transitionPartnerHotelGuestServiceOrder/);
});

test('guest services reuse the scoped immutable ledger and post atomically to the folio', async () => {
  const [service, checkoutService, page, registry, schema] = await Promise.all([
    readFile(new URL('../services/partnerHotelPosService.ts', import.meta.url), 'utf8'),
    readFile(new URL('../services/partnerOperationsService.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/partner/pms/laundry/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../lib/pms/moduleRegistry.ts', import.meta.url), 'utf8'),
    readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8'),
  ]);
  assert.match(service, /HOTEL_GUEST_SERVICE_MODES/);
  assert.match(service, /listingSource: 'MANAGED'/);
  assert.match(service, /partnerId: input\.partnerId/);
  assert.match(service, /operationalStatus: 'CHECKED_IN'/);
  assert.match(service, /ROOM_ASSIGNMENT_REQUIRED/);
  assert.match(service, /isolationLevel: 'Serializable'/);
  assert.match(service, /hotelFolioEntry\.create/);
  assert.match(service, /order\.serviceMode === 'LAUNDRY'/);
  assert.match(service, /order\.serviceMode === 'MINIBAR'/);
  assert.match(service, /order\.serviceMode === 'SPA'/);
  assert.match(service, /HOTEL_GUEST_SERVICE_ORDER/);
  assert.match(service, /assertNoOpenHotelServiceOrdersForCheckout/);
  assert.match(service, /OPEN_SERVICE_ORDERS/);
  assert.match(checkoutService, /assertNoOpenHotelServiceOrdersForCheckout/);
  assert.doesNotMatch(service, /hotelPosOrder\.(delete|update)\(/);
  assert.match(page, /existing append-only guest folio/i);
  assert.match(page, /assigned, checked-in\s+room/i);
  assert.match(registry, /href: '\/partner\/pms\/laundry'/);
  assert.match(registry, /code: 'LD'[\s\S]*status: 'LIVE'/);
  assert.match(schema, /model HotelPosOrder/);
  assert.doesNotMatch(schema, /model Hotel(?:Laundry|Minibar)Order/);
});
