import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { applyFlightResultControls } from '../lib/flight/offerFilters.ts';
import type { FlightOffer } from '../types/flight.ts';
import { createFlightResultControls } from '../utils/flightResultControls.ts';
import { flightSearchCriteriaToQuery } from '../utils/flightSearchCriteria.ts';

const offer = (overrides: Partial<FlightOffer>): FlightOffer => ({
  baggage: '15 kg',
  cabinClass: 'economy',
  currency: 'INR',
  fareFamily: 'Saver',
  id: 'offer',
  pricePerAdult: 5_000,
  refundable: false,
  seatsRemaining: 4,
  segments: [
    {
      airlineCode: 'AI',
      airlineName: 'Air India',
      arrivalAirport: 'BOM',
      arrivalAt: '2026-09-15T08:00:00+05:30',
      departureAirport: 'DEL',
      departureAt: '2026-09-15T06:00:00+05:30',
      durationMinutes: 120,
      flightNumber: 'AI101',
      leg: 'outbound',
      stops: 0,
    },
  ],
  supplier: 'fixture',
  totalPrice: 5_000,
  ...overrides,
});

test('flight result controls are bounded and normalized', () => {
  assert.deepEqual(
    createFlightResultControls(
      {
        airline: ' ai ',
        maximumTotalPrice: '8000',
        refundableOnly: 'true',
        sort: 'duration-ascending',
      },
      ['AI', '6E'],
    ),
    {
      airline: 'AI',
      maximumTotalPrice: 8_000,
      refundableOnly: true,
      sort: 'duration-ascending',
    },
  );
  assert.equal(
    createFlightResultControls({ maximumTotalPrice: '-1', sort: 'invalid' }, []).maximumTotalPrice,
    undefined,
  );
  assert.equal(createFlightResultControls({ airline: 'UK' }, ['AI', '6E']).airline, undefined);
});

test('flight reset query preserves one-way, return, and every multi-city criterion', () => {
  assert.deepEqual(
    flightSearchCriteriaToQuery({
      adults: 3,
      cabinClass: 'business',
      departureDate: '2026-10-10',
      destination: 'BOM',
      origin: 'DEL',
      returnDate: '2026-10-20',
      tripType: 'return',
    }),
    {
      adults: '3',
      cabinClass: 'business',
      departureDate: '2026-10-10',
      destination: 'BOM',
      origin: 'DEL',
      returnDate: '2026-10-20',
      tripType: 'return',
    },
  );

  assert.deepEqual(
    flightSearchCriteriaToQuery({
      adults: 2,
      cabinClass: 'premium-economy',
      departureDate: '2026-11-01',
      destination: 'BOM',
      multiCitySegments: [
        { departureDate: '2026-11-01', destination: 'BOM', origin: 'DEL' },
        { departureDate: '2026-11-04', destination: 'BLR', origin: 'BOM' },
        { departureDate: '2026-11-08', destination: 'DEL', origin: 'BLR' },
      ],
      origin: 'DEL',
      tripType: 'multi-city',
    }),
    {
      adults: '2',
      cabinClass: 'premium-economy',
      departureDate: '2026-11-01',
      destination: 'BOM',
      origin: 'DEL',
      segment2Date: '2026-11-04',
      segment2Destination: 'BLR',
      segment2Origin: 'BOM',
      segment3Date: '2026-11-08',
      segment3Destination: 'DEL',
      segment3Origin: 'BLR',
      tripType: 'multi-city',
    },
  );
});

test('flight filters and sorting operate on normalized offers', () => {
  const baseSegment = offer({}).segments[0];
  const vistara = offer({
    id: 'vistara',
    refundable: true,
    segments: [{ ...baseSegment, airlineCode: 'UK', airlineName: 'Vistara', durationMinutes: 90 }],
    totalPrice: 7_000,
  });
  const airIndia = offer({ id: 'air-india', refundable: true });
  const result = applyFlightResultControls([vistara, airIndia], {
    airline: 'AI',
    maximumTotalPrice: 6_000,
    refundableOnly: true,
    sort: 'duration-ascending',
  });
  assert.deepEqual(
    result.map((item) => item.id),
    ['air-india'],
  );
});

test('public flight marketplace is clearly unavailable until its live API is verified', () => {
  const page = readFileSync('app/flights/page.tsx', 'utf8');
  assert.match(page, /MarketplaceComingSoon/);
  assert.match(page, /product="Flights"/);
  assert.doesNotMatch(page, /flightService|availableOffers/);
});
