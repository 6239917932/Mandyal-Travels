import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  hotelVendorRequestFingerprint,
  normalizeHotelVendor,
  normalizeHotelVendorStatus,
} from '../lib/pms/vendorManagement.ts';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('vendor registration normalizes bounded property supplier details', () => {
  assert.deepEqual(
    normalizeHotelVendor({
      category: 'food_and_beverage',
      commercialNote: ' Net rates agreed for the trial. ',
      contactName: ' Anita Sharma ',
      email: ' SALES@EXAMPLE.COM ',
      legalName: ' Alpine Foods Private Limited ',
      paymentTermsDays: '30',
      phone: '+91 98765 43210',
      tradingName: ' Alpine Foods ',
      vendorCode: ' food-01 ',
    }),
    {
      category: 'FOOD_AND_BEVERAGE',
      commercialNote: 'Net rates agreed for the trial.',
      contactName: 'Anita Sharma',
      email: 'sales@example.com',
      legalName: 'Alpine Foods Private Limited',
      paymentTermsDays: 30,
      phone: '+91 98765 43210',
      tradingName: 'Alpine Foods',
      vendorCode: 'FOOD-01',
    },
  );
  assert.equal(normalizeHotelVendor({}), null);
  assert.equal(normalizeHotelVendor({ vendorCode: 'A', legalName: 'X' }), null);
});

test('vendor lifecycle changes require a version and reason', () => {
  assert.deepEqual(
    normalizeHotelVendorStatus({
      expectedVersion: '2',
      note: 'Contract temporarily suspended.',
      status: 'paused',
      vendorId: 'vendor-1',
    }),
    {
      expectedVersion: 2,
      note: 'Contract temporarily suspended.',
      status: 'PAUSED',
      vendorId: 'vendor-1',
    },
  );
  assert.equal(normalizeHotelVendorStatus({ status: 'DELETED' }), null);
  assert.equal(hotelVendorRequestFingerprint({ id: 1 }), hotelVendorRequestFingerprint({ id: 1 }));
});

test('vendor persistence is partner scoped, immutable and concurrency safe', async () => {
  const [schema, postgres, sqliteMigration, postgresMigration, service, createRoute, statusRoute] =
    await Promise.all([
      read('prisma/schema.prisma'),
      read('prisma/postgresql/schema.prisma'),
      read('prisma/migrations/20260908191000_add_hotel_vendor_management/migration.sql'),
      read('prisma/postgresql/migrations/20260908191000_add_hotel_vendor_management/migration.sql'),
      read('services/partnerVendorService.ts'),
      read('app/api/v1/partner/vendors/route.ts'),
      read('app/api/v1/partner/vendor-status/route.ts'),
    ]);
  for (const contract of [schema, postgres]) {
    assert.match(contract, /model HotelVendor[\s\S]*@@unique\(\[propertyId, vendorCode\]\)/);
    assert.match(contract, /model HotelVendorEvent[\s\S]*idempotencyKey\s+String\s+@unique/);
  }
  for (const migration of [sqliteMigration, postgresMigration]) {
    assert.match(migration, /HotelVendor_propertyId_vendorCode_key/);
    assert.match(migration, /HotelVendorEvent_vendorId_version_key/);
  }
  assert.match(service, /listingSource: 'MANAGED'[\s\S]*partnerId: input\.partnerId/);
  assert.match(service, /updateMany\([\s\S]*expectedVersion/);
  assert.match(service, /requestFingerprint !== fingerprint/);
  assert.doesNotMatch(service, /hotelVendor\.(delete|deleteMany)/);
  for (const route of [createRoute, statusRoute]) {
    assert.match(route, /isSameOriginMutation/);
    assert.match(route, /access\.memberRole !== 'ADMIN'/);
    assert.match(route, /recordPartnerAudit/);
  }
});

test('vendor management is live without claiming purchasing or payment authority', async () => {
  const [registry, page] = await Promise.all([
    read('lib/pms/moduleRegistry.ts'),
    read('app/partner/pms/vendors/page.tsx'),
  ]);
  assert.match(registry, /code: 'VM'[\s\S]*href: '\/partner\/pms\/vendors'[\s\S]*status: 'LIVE'/);
  assert.match(page, /getPartnerVendorWorkspace/);
  assert.match(page, /access\.memberRole !== 'ADMIN'/);
  assert.match(page, /does not approve purchase orders/);
  assert.match(page, /bank\s+account\s+numbers, UPI credentials, PINs, or OTPs/);
});
