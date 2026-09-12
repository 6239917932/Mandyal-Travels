import assert from 'node:assert/strict';
import test from 'node:test';

import { buildManualDistributionCsv } from '../lib/pms/manualDistribution.ts';

test('manual distribution sheet includes mapped channels and truthful status', () => {
  const csv = buildManualDistributionCsv(
    [
      {
        availableRooms: 4,
        closedToArrival: false,
        closedToDeparture: true,
        hotelName: 'Mandyal Demo Hotel',
        nightlyRate: 3200,
        note: 'Weekend control',
        roomName: 'Deluxe',
        roomTypeId: 'deluxe',
        stayDate: '2026-09-20',
        stopSell: false,
      },
    ],
    [
      {
        accountReference: 'hotel-123',
        name: 'MakeMyTrip',
        properties: ['Mandyal Demo Hotel'],
      },
    ],
  );
  assert.match(csv, /MakeMyTrip \(hotel-123\)/);
  assert.match(csv, /Manual update required/);
  assert.match(csv, /Closed to departure/);
  assert.doesNotMatch(csv, /synchronized/i);
});

test('manual distribution sheet neutralizes spreadsheet formulas', () => {
  const csv = buildManualDistributionCsv(
    [
      {
        availableRooms: 1,
        closedToArrival: false,
        closedToDeparture: false,
        hotelName: '=HYPERLINK("bad")',
        note: 'Test',
        roomName: 'Room',
        roomTypeId: 'room',
        stayDate: '2026-09-20',
        stopSell: false,
      },
    ],
    [],
  );
  assert.match(csv, /"'=HYPERLINK/);
});
