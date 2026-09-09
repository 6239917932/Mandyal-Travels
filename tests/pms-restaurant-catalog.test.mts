import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  normalizeRestaurantMenuItem,
  normalizeRestaurantOutlet,
  normalizeRestaurantReservation,
  normalizeRestaurantReservationStatus,
  normalizeRestaurantStatus,
  normalizeRestaurantTable,
  restaurantCatalogFingerprint,
  restaurantReservationSlots,
} from '../lib/pms/restaurantCatalog.ts';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('restaurant catalogue normalizes bounded outlet, table, and menu records', () => {
  assert.deepEqual(
    normalizeRestaurantOutlet({
      name: ' Valley   Restaurant ',
      outletCode: ' dining-01 ',
      propertyId: 'property-1',
      serviceArea: ' Ground floor ',
    }),
    {
      name: 'Valley Restaurant',
      outletCode: 'DINING-01',
      propertyId: 'property-1',
      serviceArea: 'Ground floor',
    },
  );
  assert.deepEqual(
    normalizeRestaurantTable({ capacity: '4', outletId: 'outlet-1', tableCode: ' t01 ' }),
    {
      capacity: 4,
      outletId: 'outlet-1',
      tableCode: 'T01',
    },
  );
  assert.deepEqual(
    normalizeRestaurantMenuItem({
      category: ' Breakfast ',
      description: ' Local breakfast platter ',
      name: ' Himachali breakfast ',
      outletId: 'outlet-1',
      unitPrice: '450',
      vegetarian: 'on',
    }),
    {
      category: 'Breakfast',
      description: 'Local breakfast platter',
      name: 'Himachali breakfast',
      outletId: 'outlet-1',
      unitPrice: 450,
      vegetarian: true,
    },
  );
  assert.equal(normalizeRestaurantTable({ capacity: 0, outletId: 'x', tableCode: 'T1' }), null);
  assert.equal(normalizeRestaurantMenuItem({ outletId: 'x', unitPrice: 0 }), null);
});

test('restaurant lifecycle validation separates table and catalogue states', () => {
  assert.deepEqual(
    normalizeRestaurantStatus({
      entityId: 'table-1',
      entityType: 'table',
      expectedVersion: '2',
      note: 'Chair repair is required.',
      status: 'out_of_service',
    }),
    {
      entityId: 'table-1',
      entityType: 'TABLE',
      expectedVersion: 2,
      note: 'Chair repair is required.',
      status: 'OUT_OF_SERVICE',
    },
  );
  assert.equal(
    normalizeRestaurantStatus({
      entityId: 'outlet-1',
      entityType: 'OUTLET',
      expectedVersion: 1,
      note: 'Temporarily unavailable.',
      status: 'OUT_OF_SERVICE',
    }),
    null,
  );
  assert.equal(restaurantCatalogFingerprint({ id: 1 }), restaurantCatalogFingerprint({ id: 1 }));
});

test('restaurant reservations normalize half-hour capacity windows and lifecycle changes', () => {
  const now = new Date('2026-09-09T03:00:00.000Z');
  const reservation = normalizeRestaurantReservation(
    {
      contactEmail: ' GUEST@EXAMPLE.COM ',
      durationMinutes: '90',
      guestName: ' Guest   Name ',
      notes: ' Window table ',
      partySize: '4',
      startsAt: '2026-09-09T04:30:00.000Z',
      tableId: 'table-1',
    },
    now,
  );
  assert.ok(reservation);
  assert.equal(reservation.contactEmail, 'guest@example.com');
  assert.equal(reservation.endsAt.toISOString(), '2026-09-09T06:00:00.000Z');
  assert.equal(
    restaurantReservationSlots('table-1', reservation.startsAt, reservation.endsAt).length,
    3,
  );
  assert.equal(
    normalizeRestaurantReservation(
      {
        contactEmail: 'guest@example.com',
        durationMinutes: 45,
        guestName: 'Guest Name',
        partySize: 2,
        startsAt: '2026-09-09T04:30:00.000Z',
        tableId: 'table-1',
      },
      now,
    ),
    null,
  );
  assert.deepEqual(
    normalizeRestaurantReservationStatus({
      expectedVersion: 1,
      note: 'Guests have been seated.',
      reservationId: 'reservation-1',
      status: 'seated',
    }),
    {
      expectedVersion: 1,
      note: 'Guests have been seated.',
      reservationId: 'reservation-1',
      status: 'SEATED',
    },
  );
});

test('restaurant persistence is partner scoped, retry safe, and append only', async () => {
  const [
    schema,
    postgres,
    sqliteMigration,
    postgresMigration,
    reservationMigration,
    postgresReservationMigration,
    service,
    route,
  ] = await Promise.all([
    read('prisma/schema.prisma'),
    read('prisma/postgresql/schema.prisma'),
    read('prisma/migrations/20260909093000_add_hotel_restaurant_catalog/migration.sql'),
    read('prisma/postgresql/migrations/20260909093000_add_hotel_restaurant_catalog/migration.sql'),
    read('prisma/migrations/20260909094500_add_hotel_restaurant_reservations/migration.sql'),
    read(
      'prisma/postgresql/migrations/20260909094500_add_hotel_restaurant_reservations/migration.sql',
    ),
    read('services/partnerRestaurantCatalogService.ts'),
    read('app/api/v1/partner/restaurant-catalog/route.ts'),
  ]);
  for (const contract of [schema, postgres]) {
    assert.match(
      contract,
      /model HotelRestaurantOutlet[\s\S]*@@unique\(\[propertyId, outletCode\]\)/,
    );
    assert.match(contract, /model HotelRestaurantTable[\s\S]*@@unique\(\[outletId, tableCode\]\)/);
    assert.match(
      contract,
      /model HotelRestaurantMenuItem[\s\S]*@@unique\(\[outletId, category, name\]\)/,
    );
    assert.match(contract, /model HotelRestaurantEvent[\s\S]*idempotencyKey\s+String\s+@unique/);
    assert.match(
      contract,
      /model HotelRestaurantReservation[\s\S]*createIdempotencyKey\s+String\s+@unique/,
    );
    assert.match(
      contract,
      /model HotelRestaurantReservationSlot[\s\S]*lockKey\s+String\?\s+@unique/,
    );
    assert.match(
      contract,
      /model HotelRestaurantReservationEvent[\s\S]*@@unique\(\[reservationId, version\]\)/,
    );
  }
  for (const migration of [reservationMigration, postgresReservationMigration]) {
    assert.match(migration, /HotelRestaurantReservationSlot_lockKey_key/);
    assert.match(migration, /HotelRestaurantReservationEvent_reservationId_version_key/);
  }
  for (const migration of [sqliteMigration, postgresMigration]) {
    assert.match(migration, /HotelRestaurantEvent_entityType_entityId_version_key/);
    assert.match(migration, /HotelRestaurantMenuItem_outletId_category_name_key/);
  }
  assert.match(service, /listingSource: 'MANAGED'[\s\S]*partnerId/);
  assert.match(service, /requestFingerprint !== input\.fingerprint/);
  assert.match(service, /updateMany\([\s\S]*version: values\.expectedVersion/);
  assert.match(service, /restaurantReservationSlots/);
  assert.match(service, /lockKey: null/);
  assert.match(service, /TABLE_HAS_RESERVATIONS/);
  assert.doesNotMatch(service, /hotelRestaurant(?:Outlet|Table|MenuItem)\.(?:delete|deleteMany)/);
  assert.match(route, /isSameOriginMutation/);
  assert.match(route, /access\.memberRole !== 'ADMIN'/);
  assert.match(route, /operationalActions\.has\(action\)/);
  assert.match(route, /recordPartnerAudit/);
});

test('restaurant module is live and reuses existing POS and folio workflows', async () => {
  const [registry, page] = await Promise.all([
    read('lib/pms/moduleRegistry.ts'),
    read('app/partner/pms/restaurant/page.tsx'),
  ]);
  assert.match(
    registry,
    /code: 'TM'[\s\S]*href: '\/partner\/pms\/restaurant'[\s\S]*status: 'LIVE'/,
  );
  assert.match(page, /getPartnerRestaurantCatalogWorkspace/);
  assert.match(page, /access\.memberRole === 'ADMIN'/);
  assert.match(page, /existing audited Point of Sale/);
  assert.match(page, /conflict protected in half-hour slots/);
  assert.match(page, /does not accept QR orders, post charges, or collect/);
});
