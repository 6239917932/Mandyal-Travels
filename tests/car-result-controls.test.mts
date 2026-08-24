import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import type { CarOffer, CarResultControlCatalogue } from '../types/car.ts';
import {
  applyCarResultControls,
  carSearchCriteriaToQuery,
  createCarResultControls,
} from '../utils/carResultControls.ts';

const catalogue: CarResultControlCatalogue = {
  categories: ['Economy', 'SUV'],
  providers: ['Alpha Rentals', 'Beta Cars'],
};

const offer = (overrides: Partial<CarOffer>): CarOffer => ({
  bags: 2,
  cancellationPolicy: 'Supplier terms apply',
  carsRemaining: 3,
  category: 'Economy',
  currency: 'INR',
  dropoffLocation: 'Delhi',
  features: [],
  fuelPolicy: 'Full to full',
  id: 'car-offer',
  mileagePolicy: 'Unlimited kilometres',
  pickupLocation: 'Delhi',
  pricePerDay: 2_000,
  providerName: 'Alpha Rentals',
  rentalMode: 'self-drive',
  seats: 5,
  source: 'fixture',
  totalPrice: 6_000,
  transmission: 'Manual',
  vehicleName: 'Compact',
  ...overrides,
});

test('car result controls accept only catalogued strings, closed values, and bounded numbers', () => {
  assert.deepEqual(
    createCarResultControls(
      {
        category: ['SUV', 'Economy'],
        maximumTotalPrice: '12500.50',
        minimumSeats: '7',
        provider: 'Beta Cars',
        sort: 'vehicle-name-ascending',
        transmission: 'Automatic',
      },
      catalogue,
    ),
    {
      category: 'SUV',
      maximumTotalPrice: 12_500.5,
      minimumSeats: 7,
      provider: 'Beta Cars',
      sort: 'vehicle-name-ascending',
      transmission: 'Automatic',
    },
  );

  assert.deepEqual(
    createCarResultControls(
      {
        category: 'Unknown',
        maximumTotalPrice: '1e6',
        minimumSeats: '21',
        provider: 'Unknown',
        sort: 'price-descending',
        transmission: 'CVT',
      },
      catalogue,
    ),
    {
      category: undefined,
      maximumTotalPrice: undefined,
      minimumSeats: undefined,
      provider: undefined,
      sort: 'price-ascending',
      transmission: undefined,
    },
  );
  assert.deepEqual(
    createCarResultControls({ maximumTotalPrice: '10000000.01', minimumSeats: '0' }, catalogue),
    {
      category: undefined,
      maximumTotalPrice: undefined,
      minimumSeats: undefined,
      provider: undefined,
      sort: 'price-ascending',
      transmission: undefined,
    },
  );
});

test('car result controls preserve every booking search criterion', () => {
  assert.deepEqual(
    carSearchCriteriaToQuery({
      drivers: 2,
      dropoffDate: '2026-10-13',
      dropoffLocation: 'New Delhi Airport',
      dropoffTime: '18:30',
      pickupDate: '2026-10-10',
      pickupLocation: 'Chandigarh Airport',
      pickupTime: '09:15',
      rentalMode: 'chauffeur',
    }),
    {
      drivers: '2',
      dropoffDate: '2026-10-13',
      dropoffLocation: 'New Delhi Airport',
      dropoffTime: '18:30',
      pickupDate: '2026-10-10',
      pickupLocation: 'Chandigarh Airport',
      pickupTime: '09:15',
      rentalMode: 'chauffeur',
    },
  );
});

test('car result controls filter existing fields without changing offer objects', () => {
  const matching = offer({
    category: 'SUV',
    id: 'matching',
    providerName: 'Beta Cars',
    seats: 7,
    totalPrice: 8_000,
    transmission: 'Automatic',
    vehicleName: 'Trail',
  });
  const tooExpensive = offer({ id: 'expensive', totalPrice: 14_000 });
  const result = applyCarResultControls([tooExpensive, matching], {
    category: 'SUV',
    maximumTotalPrice: 10_000,
    minimumSeats: 6,
    provider: 'Beta Cars',
    sort: 'price-ascending',
    transmission: 'Automatic',
  });

  assert.deepEqual(
    result.map(({ id }) => id),
    ['matching'],
  );
  assert.equal(result[0], matching);
  assert.equal(matching.cancellationPolicy, 'Supplier terms apply');
  assert.equal(matching.fuelPolicy, 'Full to full');
});

test('car result sorting is deterministic for price and vehicle name ties', () => {
  const beta = offer({
    id: 'beta',
    providerName: 'Beta Cars',
    totalPrice: 5_000,
    vehicleName: 'Aero',
  });
  const alpha = offer({
    id: 'alpha',
    providerName: 'Alpha Rentals',
    totalPrice: 5_000,
    vehicleName: 'Aero',
  });
  const city = offer({ id: 'city', totalPrice: 4_000, vehicleName: 'City' });
  const controls = { sort: 'price-ascending' } as const;

  assert.deepEqual(
    applyCarResultControls([beta, city, alpha], controls).map(({ id }) => id),
    ['city', 'alpha', 'beta'],
  );
  assert.deepEqual(
    applyCarResultControls([city, beta, alpha], { sort: 'vehicle-name-ascending' }).map(
      ({ id }) => id,
    ),
    ['alpha', 'beta', 'city'],
  );
  assert.deepEqual(
    [beta, city, alpha].map(({ id }) => id),
    ['beta', 'city', 'alpha'],
  );
});

test('car results keep error, source-empty, and filter-empty states distinct', () => {
  const page = readFileSync('app/cars/page.tsx', 'utf8');
  assert.match(page, /\{!error \? \(/);
  assert.match(page, /availableOffers\.length > 0/);
  assert.match(page, /No cars match the active filters\./);
  assert.match(page, /Clear filters/);
  assert.match(page, /No cars are available for this search\./);
});
