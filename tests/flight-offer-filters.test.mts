import assert from 'node:assert/strict';
import test from 'node:test';

import { applyFlightResultControls } from '../lib/flight/offerFilters.ts';
import type { FlightOffer } from '../types/flight.ts';
import { createFlightResultControls } from '../utils/flightResultControls.ts';

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
    createFlightResultControls({
      airline: ' ai ',
      maximumTotalPrice: '8000',
      refundableOnly: 'true',
      sort: 'duration-ascending',
    }),
    {
      airline: 'AI',
      maximumTotalPrice: 8_000,
      refundableOnly: true,
      sort: 'duration-ascending',
    },
  );
  assert.equal(
    createFlightResultControls({ maximumTotalPrice: '-1', sort: 'invalid' }).maximumTotalPrice,
    undefined,
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
