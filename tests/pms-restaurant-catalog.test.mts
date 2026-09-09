import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  normalizeRestaurantMenuItem,
  normalizeRestaurantOutlet,
  normalizeRestaurantStatus,
  normalizeRestaurantTable,
  restaurantCatalogFingerprint,
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

test('restaurant persistence is partner scoped, retry safe, and append only', async () => {
  const [schema, postgres, sqliteMigration, postgresMigration, service, route] = await Promise.all([
    read('prisma/schema.prisma'),
    read('prisma/postgresql/schema.prisma'),
    read('prisma/migrations/20260909093000_add_hotel_restaurant_catalog/migration.sql'),
    read('prisma/postgresql/migrations/20260909093000_add_hotel_restaurant_catalog/migration.sql'),
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
  }
  for (const migration of [sqliteMigration, postgresMigration]) {
    assert.match(migration, /HotelRestaurantEvent_entityType_entityId_version_key/);
    assert.match(migration, /HotelRestaurantMenuItem_outletId_category_name_key/);
  }
  assert.match(service, /listingSource: 'MANAGED'[\s\S]*partnerId/);
  assert.match(service, /requestFingerprint !== input\.fingerprint/);
  assert.match(service, /updateMany\([\s\S]*version: values\.expectedVersion/);
  assert.doesNotMatch(service, /hotelRestaurant(?:Outlet|Table|MenuItem)\.(?:delete|deleteMany)/);
  assert.match(route, /isSameOriginMutation/);
  assert.match(route, /access\.memberRole !== 'ADMIN'/);
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
  assert.match(page, /access\.memberRole !== 'ADMIN'/);
  assert.match(page, /existing audited Point of Sale/);
  assert.match(page, /does not reserve tables, accept QR orders, post charges, or collect/);
});
