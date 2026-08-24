import assert from 'node:assert/strict';
import test from 'node:test';
import { applyBusResultControls } from '../lib/bus/offerFilters.ts';
import type { BusOffer } from '../types/bus.ts';

const offer = (id: string, price: number, refundable: boolean, rating: number): BusOffer => ({
  amenities: [],
  arrivalAt: '2026-09-20T06:00:00+05:30',
  boardingPoint: 'A',
  busType: id === 'a' ? 'Sleeper' : 'Seater',
  cancellationPolicy: 'Policy',
  currency: 'INR',
  departureAt: id === 'a' ? '2026-09-20T01:00:00+05:30' : '2026-09-20T02:00:00+05:30',
  destination: 'Delhi',
  droppingPoint: 'B',
  id,
  operatorName: id === 'a' ? 'Alpha' : 'Beta',
  origin: 'Chandigarh',
  pricePerSeat: price,
  refundable,
  rating,
  seatsRemaining: 5,
  source: 'Test',
  totalPrice: price,
});

test('bus controls filter governed offers and sort stably', () => {
  const offers = [offer('a', 1000, true, 4.2), offer('b', 800, false, 4.8)];
  const originalOrder = [...offers];
  assert.deepEqual(
    applyBusResultControls(offers, { refundableOnly: true, sort: 'price-ascending' }).map(
      ({ id }) => id,
    ),
    ['a'],
  );
  assert.deepEqual(
    applyBusResultControls(offers, { refundableOnly: false, sort: 'rating-descending' }).map(
      ({ id }) => id,
    ),
    ['b', 'a'],
  );
  assert.deepEqual(
    applyBusResultControls(offers, {
      busType: 'Sleeper',
      maximumTotalPrice: 1200,
      operator: 'Alpha',
      refundableOnly: false,
      sort: 'departure-ascending',
    }).map(({ id }) => id),
    ['a'],
  );
  assert.deepEqual(offers, originalOrder);
});
