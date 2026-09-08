import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCentralReservationProjection } from '../lib/pms/centralReservations.ts';
import { getPmsModule } from '../lib/pms/moduleRegistry.ts';

const properties = [
  { id: 'one', name: 'One Hotel', operationalDate: '2026-09-08', slug: 'one-hotel' },
  { id: 'two', name: 'Two Hotel', operationalDate: '2026-09-09', slug: 'two-hotel' },
];

function booking(input: Partial<Parameters<typeof buildCentralReservationProjection>[1][number]>) {
  return {
    assignedRoomNumbersJson: '[]',
    checkInDate: '2026-09-08',
    checkOutDate: '2026-09-10',
    confirmationCode: 'MT-ONE',
    guestName: 'Test Guest',
    hotelSlug: 'one-hotel',
    operationalStatus: 'RESERVED',
    rooms: 1,
    source: 'ONLINE',
    status: 'confirmed',
    ...input,
  };
}

test('central reservations summarizes each property against its own operational date', () => {
  const result = buildCentralReservationProjection(properties, [
    booking({}),
    booking({
      assignedRoomNumbersJson: '["201"]',
      checkInDate: '2026-09-09',
      confirmationCode: 'MT-TWO',
      hotelSlug: 'two-hotel',
      operationalStatus: 'CHECKED_IN',
      rooms: 2,
    }),
  ]);
  assert.deepEqual(result.totals, {
    activeReservations: 2,
    arrivalsToday: 3,
    inHouse: 2,
    unassignedArrivals: 1,
  });
  assert.equal(result.summaries[0]?.unassignedArrivals, 1);
  assert.equal(result.summaries[1]?.operationalDate, '2026-09-09');
});

test('central reservations fails closed for non-owned, cancelled and historical records', () => {
  const result = buildCentralReservationProjection(properties, [
    booking({ confirmationCode: 'FOREIGN', hotelSlug: 'foreign' }),
    booking({ confirmationCode: 'CANCELLED', status: 'cancelled' }),
    booking({ confirmationCode: 'NO-SHOW', operationalStatus: 'NO_SHOW' }),
    booking({ checkInDate: '2026-10-01', confirmationCode: 'FAR-FUTURE' }),
  ]);
  assert.equal(result.totals.activeReservations, 1);
  assert.equal(result.arrivals.length, 0);
});

test('central reservations is registered as a live distinct PMS destination', () => {
  const centralModule = getPmsModule('CR');
  assert.equal(centralModule?.status, 'LIVE');
  assert.equal(centralModule?.href, '/partner/pms/central-reservations');
});
