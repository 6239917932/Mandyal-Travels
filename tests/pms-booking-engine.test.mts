import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { assessBookingEngineReadiness } from '../lib/pms/bookingEngineReadiness.ts';

const readyInput = {
  activeRatePlans: 1,
  activeRoomTypes: 1,
  approvalStatus: 'APPROVED',
  commissionBasisPoints: 1_800,
  hasApprovedApplication: true,
  hasContactDetails: true,
  hasDescription: true,
  hasLocation: true,
  hasMedia: true,
  inventoryCount: 2,
  partnerActive: true,
  publicationStatus: 'PUBLISHED',
  publicListingsEnabled: true,
  status: 'ACTIVE',
  taxProfileReady: true,
} as const;

test('booking engine requires every property and platform release gate', () => {
  const ready = assessBookingEngineReadiness(readyInput);
  assert.equal(ready.ready, true);
  assert.equal(ready.readyChecks, ready.totalChecks);

  const blocked = assessBookingEngineReadiness({
    ...readyInput,
    activeRatePlans: 0,
    publicListingsEnabled: false,
  });
  assert.equal(blocked.ready, false);
  assert.equal(blocked.readyChecks, blocked.totalChecks - 2);
});

test('booking engine is a control layer over the existing public flow', async () => {
  const [page, service, registry] = await Promise.all([
    readFile(new URL('../app/partner/pms/booking-engine/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../services/partnerBookingEngineService.ts', import.meta.url), 'utf8'),
    readFile(new URL('../lib/pms/moduleRegistry.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(page, /href=\{workspace\.customerFlow\.search\}/);
  assert.match(service, /search: '\/hotels'/);
  assert.match(service, /quote: '\/api\/v1\/hotels\/quotes'/);
  assert.match(service, /booking: '\/api\/v1\/hotels\/bookings'/);
  assert.doesNotMatch(service, /\.create\(|\.update\(|\.delete\(/);
  assert.match(
    registry,
    /href: '\/partner\/pms\/booking-engine'[\s\S]*name: 'Booking engine'[\s\S]*status: 'LIVE'/,
  );
});
