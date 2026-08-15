import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeBusOffer, validateBusSearchCriteria } from '../lib/bus/searchRules.ts';
import type { BusOffer, BusSearchCriteria } from '../types/bus.ts';

const criteria: BusSearchCriteria = {
  destination: 'Delhi',
  origin: 'Chandigarh',
  passengers: 2,
  travelDate: '2026-09-20',
};
const offer: BusOffer = {
  amenities: ['Wi-Fi', 'Wi-Fi', ' Charging point '],
  arrivalAt: '2026-09-20T06:15:00+05:30',
  boardingPoint: 'ISBT Sector 43',
  busType: 'AC Sleeper',
  cancellationPolicy: 'Free cancellation until 12 hours before departure',
  currency: 'INR',
  departureAt: '2026-09-20T01:00:00+05:30',
  destination: 'Delhi',
  droppingPoint: 'Kashmiri Gate ISBT',
  id: 'bus-1',
  operatorName: 'Himalayan Roadways',
  origin: 'Chandigarh',
  pricePerSeat: 1000,
  refundable: true,
  rating: 4.5,
  seatsRemaining: 3,
  source: 'Test adapter',
  totalPrice: 0,
};

test('bus criteria enforce routes, passenger bounds and dates', () => {
  assert.doesNotThrow(() => validateBusSearchCriteria(criteria, '2026-08-15'));
  assert.throws(() => validateBusSearchCriteria({ ...criteria, passengers: 7 }, '2026-08-15'), /between 1 and 6/);
  assert.throws(() => validateBusSearchCriteria({ ...criteria, destination: 'chandigarh' }, '2026-08-15'), /must be different/);
  assert.throws(() => validateBusSearchCriteria({ ...criteria, travelDate: '2026-08-14' }, '2026-08-15'), /cannot be in the past/);
});

test('bus offers must match route, date, inventory, timing and price', () => {
  const normalized = normalizeBusOffer(offer, criteria);
  assert.equal(normalized?.totalPrice, 2000);
  assert.deepEqual(normalized?.amenities, ['Wi-Fi', 'Charging point']);
  assert.equal(normalizeBusOffer(offer, { ...criteria, travelDate: '2026-09-21' }), undefined);
  assert.equal(normalizeBusOffer({ ...offer, seatsRemaining: 1 }, criteria), undefined);
  assert.equal(normalizeBusOffer({ ...offer, arrivalAt: offer.departureAt }, criteria), undefined);
});
