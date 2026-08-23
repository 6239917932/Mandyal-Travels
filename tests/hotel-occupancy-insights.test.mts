import assert from 'node:assert/strict';
import test from 'node:test';

import { buildHotelOccupancyInsights } from '../services/hotelOccupancyInsightService.ts';

test('hotel occupancy insights calculate overlapping stays and bounded sellable capacity', () => {
  const [insight] = buildHotelOccupancyInsights({
    bookings: [
      {
        checkInDate: '2026-09-01',
        checkOutDate: '2026-09-04',
        hotelSlug: 'hill-view',
        rooms: 2,
      },
    ],
    from: '2026-09-02',
    inventoryDays: [
      {
        availableRooms: 3,
        roomTypeId: 'deluxe',
        stayDate: '2026-09-02',
        stopSell: false,
      },
      {
        availableRooms: 5,
        roomTypeId: 'deluxe',
        stayDate: '2026-09-03',
        stopSell: true,
      },
    ],
    roomTypes: [
      {
        hotelSlug: 'hill-view',
        inventoryCount: 5,
        propertyName: 'Hill View',
        roomTypeId: 'deluxe',
      },
    ],
    through: '2026-09-03',
  });

  assert.deepEqual(insight, {
    declaredRoomNights: 10,
    hotelSlug: 'hill-view',
    occupancyPercent: 40,
    occupiedRoomNights: 4,
    propertyName: 'Hill View',
    recommendation:
      'Balanced occupancy: monitor booking pace and preserve current controls unless new evidence supports a change.',
    sellableRoomNights: 3,
    stopSellRoomNights: 5,
  });
});

test('hotel occupancy insights flag recorded demand above declared capacity', () => {
  const [insight] = buildHotelOccupancyInsights({
    bookings: [
      {
        checkInDate: '2026-09-01',
        checkOutDate: '2026-09-02',
        hotelSlug: 'small-stay',
        rooms: 2,
      },
    ],
    from: '2026-09-01',
    inventoryDays: [],
    roomTypes: [
      {
        hotelSlug: 'small-stay',
        inventoryCount: 1,
        propertyName: 'Small Stay',
        roomTypeId: 'standard',
      },
    ],
    through: '2026-09-01',
  });

  assert.equal(insight?.occupancyPercent, 200);
  assert.match(insight?.recommendation ?? '', /reconcile/i);
});

test('hotel occupancy insights do not invent guidance without active room capacity', () => {
  assert.deepEqual(
    buildHotelOccupancyInsights({
      bookings: [],
      from: '2026-09-01',
      inventoryDays: [],
      roomTypes: [],
      through: '2026-09-02',
    }),
    [],
  );
});
