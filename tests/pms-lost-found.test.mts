import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  isLostFoundTransitionAllowed,
  lostFoundRequestFingerprint,
  normalizeLostFoundEvent,
  normalizeLostFoundItem,
} from '../lib/pms/lostFound.ts';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('lost-and-found registration validates bounded custody evidence', () => {
  assert.deepEqual(
    normalizeLostFoundItem({
      description: 'Black leather wallet with a small silver zip.',
      foundBy: 'Housekeeping desk',
      foundLocation: 'Room 103 wardrobe',
      foundOn: '2026-09-13',
      itemName: 'Wallet',
      referenceCode: ' lf-1001 ',
      reservationReference: ' mt-123 ',
      storageLocation: 'Duty manager safe',
    }),
    {
      description: 'Black leather wallet with a small silver zip.',
      foundBy: 'Housekeeping desk',
      foundLocation: 'Room 103 wardrobe',
      foundOn: '2026-09-13',
      itemName: 'Wallet',
      referenceCode: 'LF-1001',
      reservationReference: 'MT-123',
      storageLocation: 'Duty manager safe',
    },
  );
  assert.equal(normalizeLostFoundItem({}), null);
  assert.equal(
    normalizeLostFoundItem({
      description: 'Found item',
      foundBy: 'Desk',
      foundLocation: 'Lobby',
      foundOn: '2099-01-01',
      itemName: 'Bag',
      referenceCode: 'LF-1',
      storageLocation: 'Locker',
    }),
    null,
  );
});

test('custody transitions require reasons and release evidence', () => {
  assert.deepEqual(
    normalizeLostFoundEvent({
      expectedVersion: 2,
      itemId: 'item-1',
      note: 'Claimant matched the recorded item description.',
      releaseEvidenceReference: 'ACK-100',
      releasedTo: 'Registered guest',
      toStatus: 'returned',
    }),
    {
      expectedVersion: 2,
      itemId: 'item-1',
      note: 'Claimant matched the recorded item description.',
      releaseEvidenceReference: 'ACK-100',
      releasedTo: 'Registered guest',
      toStatus: 'RETURNED',
    },
  );
  assert.equal(
    normalizeLostFoundEvent({
      expectedVersion: 1,
      itemId: 'item-1',
      note: 'Returned',
      toStatus: 'RETURNED',
    }),
    null,
  );
  assert.equal(isLostFoundTransitionAllowed('IN_CUSTODY', 'MATCHED'), true);
  assert.equal(isLostFoundTransitionAllowed('MATCHED', 'RETURNED'), true);
  assert.equal(isLostFoundTransitionAllowed('RETURNED', 'IN_CUSTODY'), false);
  assert.equal(lostFoundRequestFingerprint({ id: 1 }), lostFoundRequestFingerprint({ id: 1 }));
});

test('lost-and-found persistence is scoped, immutable, and retry safe', async () => {
  const [schema, postgres, sqliteMigration, postgresMigration, service, createRoute, eventRoute] =
    await Promise.all([
      read('prisma/schema.prisma'),
      read('prisma/postgresql/schema.prisma'),
      read('prisma/migrations/20260914113000_add_hotel_lost_found/migration.sql'),
      read('prisma/postgresql/migrations/20260914113000_add_hotel_lost_found/migration.sql'),
      read('services/partnerLostFoundService.ts'),
      read('app/api/v1/partner/lost-found/route.ts'),
      read('app/api/v1/partner/lost-found-events/route.ts'),
    ]);
  for (const contract of [schema, postgres]) {
    assert.match(
      contract,
      /model HotelLostFoundItem[\s\S]*@@unique\(\[propertyId, referenceCode\]\)/,
    );
    assert.match(contract, /model HotelLostFoundEvent[\s\S]*idempotencyKey\s+String\s+@unique/);
  }
  for (const migration of [sqliteMigration, postgresMigration]) {
    assert.match(migration, /HotelLostFoundItem_propertyId_referenceCode_key/);
    assert.match(migration, /HotelLostFoundEvent_itemId_version_key/);
  }
  assert.match(service, /listingSource: 'MANAGED'[\s\S]*partnerId: input\.partnerId/);
  assert.match(service, /updateMany\([\s\S]*expectedVersion/);
  assert.match(service, /requestFingerprint !== fingerprint/);
  for (const route of [createRoute, eventRoute]) {
    assert.match(route, /isSameOriginMutation/);
    assert.match(route, /recordPartnerAudit/);
  }
});

test('lost-and-found is a live privacy-minimized PMS workspace', async () => {
  const [registry, page] = await Promise.all([
    read('lib/pms/moduleRegistry.ts'),
    read('app/partner/pms/lost-found/page.tsx'),
  ]);
  assert.match(registry, /code: 'LF'[\s\S]*status: 'LIVE'/);
  assert.match(page, /getPartnerLostFoundWorkspace/);
  assert.match(page, /do not enter Aadhaar, passport, card, bank,\s+PIN, OTP/);
});
