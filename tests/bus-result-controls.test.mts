import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type { BusOffer } from '../types/bus.ts';
import { busSearchCriteriaToQuery } from '../utils/busSearchCriteria.ts';
import {
  createBusResultControlCatalogue,
  createBusResultControls,
} from '../utils/busResultControls.ts';

const offer = (overrides: Partial<BusOffer> = {}): BusOffer => ({
  amenities: [],
  arrivalAt: '2026-09-20T06:00:00+05:30',
  boardingPoint: 'Sector 43',
  busType: 'Sleeper',
  cancellationPolicy: 'Policy',
  currency: 'INR',
  departureAt: '2026-09-20T01:00:00+05:30',
  destination: 'Delhi',
  droppingPoint: 'ISBT',
  id: 'bus-1',
  operatorName: 'Alpha Travels',
  origin: 'Chandigarh',
  pricePerSeat: 1_000,
  refundable: true,
  rating: 4.5,
  seatsRemaining: 5,
  source: 'Test',
  totalPrice: 1_000,
  ...overrides,
});

test('bus control catalogue is derived only from safe returned offer values', () => {
  const catalogue = createBusResultControlCatalogue([
    offer(),
    offer({ busType: 'Seater', id: 'bus-2', operatorName: 'Beta Coaches' }),
    offer({ busType: ' Sleeper ', id: 'bus-3', operatorName: 'Alpha Travels' }),
    offer({ busType: 'Bad\nType', id: 'bus-4', operatorName: '' }),
  ]);

  assert.deepEqual(catalogue, {
    busTypes: ['Seater', 'Sleeper'],
    operators: ['Alpha Travels', 'Beta Coaches'],
  });
});

test('bus operator and type controls fail closed against the returned catalogue', () => {
  const catalogue = { busTypes: ['Sleeper'], operators: ['Alpha Travels'] };
  assert.deepEqual(
    createBusResultControls(
      {
        busType: 'Not returned',
        maximumTotalPrice: '1e6',
        operator: 'Injected operator',
        refundableOnly: 'TRUE',
        sort: 'unknown',
      },
      catalogue,
    ),
    {
      busType: undefined,
      maximumTotalPrice: undefined,
      operator: undefined,
      refundableOnly: false,
      sort: 'price-ascending',
    },
  );

  assert.deepEqual(
    createBusResultControls(
      {
        busType: ['Sleeper', 'Not returned'],
        maximumTotalPrice: '1250.50',
        operator: ['Alpha Travels', 'Injected operator'],
        refundableOnly: 'true',
        sort: 'rating-descending',
      },
      catalogue,
    ),
    {
      busType: 'Sleeper',
      maximumTotalPrice: 1_250.5,
      operator: 'Alpha Travels',
      refundableOnly: true,
      sort: 'rating-descending',
    },
  );
});

test('bus page keeps error, source-empty, and filter-empty result states distinct', async () => {
  const page = await readFile(new URL('../app/buses/page.tsx', import.meta.url), 'utf8');

  assert.match(page, /let availableOffers = \[\]/);
  assert.match(page, /!error \? \(/);
  assert.match(page, /availableOffers\.length > 0 \? \(/);
  assert.match(page, /No buses match the active filters\./);
  assert.match(page, /No verified buses are available for this search\./);
  assert.match(page, /Bus search is temporarily unavailable\. Please try again\./);
  assert.doesNotMatch(page, /cause\.message/);
});

test('bus clear-filter links preserve only the search criteria', async () => {
  const controls = await readFile(
    new URL('../components/bus/BusResultControls.tsx', import.meta.url),
    'utf8',
  );

  assert.match(controls, /busSearchCriteriaToQuery\(criteria\)/);
  assert.match(controls, /pathname: '\/buses', query: searchCriteria/);
  assert.match(controls, />\s*Clear filters\s*</);
  assert.match(controls, /aria-label="Filter and sort bus results"/);
  assert.deepEqual(
    busSearchCriteriaToQuery({
      destination: 'Delhi',
      origin: 'Chandigarh',
      passengers: 2,
      travelDate: '2026-09-20',
    }),
    {
      destination: 'Delhi',
      origin: 'Chandigarh',
      passengers: '2',
      travelDate: '2026-09-20',
    },
  );
});
