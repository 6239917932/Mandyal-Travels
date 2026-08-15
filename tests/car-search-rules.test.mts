import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeCarOffer,
  rentalDurationDays,
  validateCarSearchCriteria,
} from '../lib/car/searchRules.ts';
import type { CarOffer, CarSearchCriteria } from '../types/car.ts';

const criteria: CarSearchCriteria = {
  drivers: 1,
  dropoffDate: '2026-10-13',
  dropoffLocation: 'Delhi',
  pickupDate: '2026-10-10',
  pickupLocation: 'Delhi',
  rentalMode: 'self-drive',
};
const offer: CarOffer = {
  bags: 2,
  cancellationPolicy: 'Free cancellation until 24 hours before pickup',
  carsRemaining: 2,
  category: 'Economy',
  currency: 'INR',
  dropoffLocation: 'Delhi',
  features: ['Bluetooth', ' Bluetooth ', 'Air conditioning'],
  fuelPolicy: 'Full to full',
  id: 'car-1',
  mileagePolicy: 'Unlimited kilometres',
  pickupLocation: 'Delhi',
  rentalMode: 'self-drive',
  pricePerDay: 2000,
  providerName: 'Mandyal Drive',
  seats: 5,
  source: 'Test adapter',
  totalPrice: 0,
  transmission: 'Manual',
  vehicleName: 'Compact car',
};

test('car criteria enforce driver and rental-duration bounds', () => {
  assert.equal(rentalDurationDays(criteria.pickupDate, criteria.dropoffDate), 3);
  assert.doesNotThrow(() => validateCarSearchCriteria(criteria, '2026-08-15'));
  assert.throws(() => validateCarSearchCriteria({ ...criteria, drivers: 5 }, '2026-08-15'), /between 1 and 4/);
  assert.throws(() => validateCarSearchCriteria({ ...criteria, dropoffDate: criteria.pickupDate }, '2026-08-15'), /after pickup/);
  assert.throws(() => validateCarSearchCriteria({ ...criteria, dropoffDate: '2027-01-20' }, '2026-08-15'), /limited to 90 days/);
});

test('car offers must match locations, inventory, capacity and positive pricing', () => {
  const normalized = normalizeCarOffer(offer, criteria);
  assert.equal(normalized?.totalPrice, 6000);
  assert.deepEqual(normalized?.features, ['Bluetooth', 'Air conditioning']);
  assert.equal(normalizeCarOffer({ ...offer, carsRemaining: 0 }, criteria), undefined);
  assert.equal(normalizeCarOffer({ ...offer, pricePerDay: 0 }, criteria), undefined);
  assert.equal(normalizeCarOffer({ ...offer, pickupLocation: 'Mumbai' }, criteria), undefined);
  assert.equal(normalizeCarOffer({ ...offer, rentalMode: 'chauffeur' }, criteria), undefined);
});
