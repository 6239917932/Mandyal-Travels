import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  fixedAssetRequestFingerprint,
  normalizeFixedAsset,
  normalizeFixedAssetEvent,
} from '../lib/pms/fixedAssets.ts';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('fixed assets normalize bounded money, identity, and custody fields', () => {
  assert.deepEqual(
    normalizeFixedAsset({
      acquiredOn: '2026-09-08',
      acquisitionCost: '12500.50',
      assetTag: ' tv-101 ',
      category: 'electrical',
      custodian: ' Front office ',
      invoiceReference: ' INV-100 ',
      location: ' Room 101 ',
      name: ' Guest television ',
    }),
    {
      acquiredOn: '2026-09-08',
      acquisitionCostMinor: 1_250_050,
      assetTag: 'TV-101',
      category: 'ELECTRICAL',
      custodian: 'Front office',
      invoiceReference: 'INV-100',
      location: 'Room 101',
      name: 'Guest television',
    },
  );
  assert.equal(normalizeFixedAsset({}), null);
  assert.equal(
    normalizeFixedAsset({
      acquiredOn: '08/09/2026',
      acquisitionCost: 'NaN',
      assetTag: 'A',
      category: 'OTHER',
      invoiceReference: '',
      location: '',
      name: '',
    }),
    null,
  );
  assert.equal(
    normalizeFixedAsset({
      acquiredOn: '2026-99-99',
      acquisitionCost: '100',
      assetTag: 'ASSET-1',
      category: 'IT',
      invoiceReference: 'INV-1',
      location: 'Office',
      name: 'Computer',
    }),
    null,
  );
  assert.equal(
    normalizeFixedAsset({
      acquiredOn: '2026-09-08',
      acquisitionCost: '21474836.48',
      assetTag: 'ASSET-1',
      category: 'IT',
      invoiceReference: 'INV-1',
      location: 'Office',
      name: 'Computer',
    }),
    null,
  );
});

test('asset events require versioned, reasoned verification or movement', () => {
  assert.deepEqual(
    normalizeFixedAssetEvent({
      assetId: 'asset-1',
      custodian: 'Engineering',
      eventType: 'moved',
      expectedVersion: '2',
      location: 'Plant room',
      note: 'Transferred after inspection.',
    }),
    {
      assetId: 'asset-1',
      custodian: 'Engineering',
      eventType: 'MOVED',
      expectedVersion: 2,
      location: 'Plant room',
      note: 'Transferred after inspection.',
    },
  );
  assert.equal(
    normalizeFixedAssetEvent({
      assetId: 'asset-1',
      eventType: 'MOVED',
      expectedVersion: 1,
      location: '',
      note: 'Moved',
    }),
    null,
  );
  assert.equal(fixedAssetRequestFingerprint({ id: 1 }), fixedAssetRequestFingerprint({ id: 1 }));
});

test('fixed-asset persistence and routes enforce partner scope and immutable events', async () => {
  const [schema, postgres, sqliteMigration, postgresMigration, service, createRoute, eventRoute] =
    await Promise.all([
      read('prisma/schema.prisma'),
      read('prisma/postgresql/schema.prisma'),
      read('prisma/migrations/20260908154500_add_hotel_fixed_assets/migration.sql'),
      read('prisma/postgresql/migrations/20260908154500_add_hotel_fixed_assets/migration.sql'),
      read('services/partnerFixedAssetService.ts'),
      read('app/api/v1/partner/fixed-assets/route.ts'),
      read('app/api/v1/partner/fixed-asset-events/route.ts'),
    ]);
  for (const contract of [schema, postgres]) {
    assert.match(contract, /model HotelFixedAsset[\s\S]*@@unique\(\[propertyId, assetTag\]\)/);
    assert.match(contract, /model HotelFixedAssetEvent[\s\S]*idempotencyKey\s+String\s+@unique/);
  }
  for (const migration of [sqliteMigration, postgresMigration]) {
    assert.match(migration, /HotelFixedAsset_propertyId_assetTag_key/);
    assert.match(migration, /HotelFixedAssetEvent_idempotencyKey_key/);
  }
  assert.match(service, /listingSource: 'MANAGED'[\s\S]*partnerId: input\.partnerId/);
  assert.match(service, /updateMany\([\s\S]*expectedVersion/);
  assert.match(service, /requestFingerprint !== fingerprint/);
  for (const route of [createRoute, eventRoute]) {
    assert.match(route, /isSameOriginMutation/);
    assert.match(route, /access\.memberRole !== 'ADMIN'/);
    assert.match(route, /recordPartnerAudit/);
  }
});

test('fixed-assets workspace is live but statutory depreciation remains blocked', async () => {
  const [registry, page] = await Promise.all([
    read('lib/pms/moduleRegistry.ts'),
    read('app/partner/pms/fixed-assets/page.tsx'),
  ]);
  assert.match(registry, /code: 'FA'[\s\S]*status: 'LIVE'/);
  assert.match(page, /getPartnerFixedAssetWorkspace/);
  assert.match(page, /access\.memberRole !== 'ADMIN'/);
  assert.match(page, /Depreciation[\s\S]*remains?\s+disabled/);
  assert.match(page, /Consumable stock and\s+repairs remain outside this register/);
});
