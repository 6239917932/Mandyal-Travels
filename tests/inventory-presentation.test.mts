import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { inventorySourceLabel } from '../lib/inventory/sourceLabels.ts';
import {
  formatIndiaCalendarDate,
  formatLocalCalendarDate,
  isValidCalendarDate,
  offsetLocalCalendarDate,
} from '../utils/localDate.ts';

test('inventory provenance names the local PMS and external API paths explicitly', () => {
  assert.equal(inventorySourceLabel('direct'), 'Mandyal PMS/local inventory');
  assert.equal(inventorySourceLabel('supplier'), 'External API supplier inventory');
});

test('inventory provenance stays off results and is restricted on hotel details', async () => {
  const [hotelCard, hotelDetail, adminPartnerRecord] = await Promise.all([
    readFile('components/hotel/HotelResultCard.tsx', 'utf8'),
    readFile('app/hotels/[slug]/page.tsx', 'utf8'),
    readFile('app/admin/partners/[partnerId]/page.tsx', 'utf8'),
  ]);

  assert.doesNotMatch(hotelCard, /inventorySourceLabel|hotel-result-card__source/);
  assert.match(hotelDetail, /platformAdmin \? \([\s\S]*inventorySourceLabel/);
  assert.match(hotelDetail, /Admin inventory source/);
  assert.match(adminPartnerRecord, /inventorySourceLabel/);
});

test('calendar formatting preserves positive-offset local dates without UTC rollback', () => {
  const localMidnight = new Date(2026, 7, 23, 0, 30);
  assert.equal(formatLocalCalendarDate(localMidnight), '2026-08-23');
  assert.equal(offsetLocalCalendarDate('2026-08-23', 1), '2026-08-24');
  assert.equal(formatIndiaCalendarDate(new Date('2026-09-10T20:00:00.000Z')), '2026-09-11');
  assert.equal(isValidCalendarDate('2026-02-28'), true);
  assert.equal(isValidCalendarDate('2026-02-30'), false);
});
