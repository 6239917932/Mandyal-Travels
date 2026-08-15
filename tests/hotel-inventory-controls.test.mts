import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateHotelStayCharge,
  evaluateHotelStayInventory,
  type HotelInventoryDay,
} from '../lib/hotel/inventoryControls.ts';

const day = (stayDate: string, overrides: Partial<HotelInventoryDay> = {}): HotelInventoryDay => ({
  availableRooms: 5,
  stayDate,
  stopSell: false,
  ...overrides,
});

test('inventory returns the lowest room availability across the stay', () => {
  const result = evaluateHotelStayInventory(
    [day('2026-10-18'), day('2026-10-19', { availableRooms: 2 }), day('2026-10-20', { availableRooms: 4 })],
    '2026-10-18',
    '2026-10-21',
  );
  assert.equal(result.availableRooms, 2);
  assert.equal(result.stopSell, false);
});

test('stop-sell and closed arrival or departure make the stay unavailable', () => {
  assert.equal(
    evaluateHotelStayInventory([day('2026-10-18', { stopSell: true })], '2026-10-18', '2026-10-19').availableRooms,
    0,
  );
  assert.match(
    evaluateHotelStayInventory([day('2026-10-18', { closedToArrival: true })], '2026-10-18', '2026-10-19')
      .restrictionMessage ?? '',
    /Arrivals are closed/,
  );
  assert.match(
    evaluateHotelStayInventory([day('2026-10-18'), day('2026-10-19', { closedToDeparture: true })], '2026-10-18', '2026-10-19')
      .restrictionMessage ?? '',
    /Departures are closed/,
  );
});

test('minimum and maximum stay restrictions are enforced', () => {
  const tooShort = evaluateHotelStayInventory(
    [day('2026-10-18', { minimumStayNights: 2 })],
    '2026-10-18',
    '2026-10-19',
  );
  assert.equal(tooShort.stopSell, true);
  assert.match(tooShort.restrictionMessage ?? '', /between 2 and 90 nights/);

  const tooLong = evaluateHotelStayInventory(
    [day('2026-10-18', { maximumStayNights: 1 }), day('2026-10-19', { maximumStayNights: 1 })],
    '2026-10-18',
    '2026-10-20',
  );
  assert.equal(tooLong.stopSell, true);
});

test('seasonal nightly prices fall back per missing date', () => {
  assert.equal(
    calculateHotelStayCharge('2026-10-18', 3, 3_500, [
      { nightlyRate: 4_000, stayDate: '2026-10-18' },
      { nightlyRate: 4_500, stayDate: '2026-10-20' },
    ]),
    12_000,
  );
});
