import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeFlightOffer, validateFlightSearchCriteria } from '../lib/flight/searchRules.ts';
import type { FlightOffer, FlightSearchCriteria } from '../types/flight.ts';

const criteria: FlightSearchCriteria = {
  adults: 2,
  cabinClass: 'economy',
  departureDate: '2026-09-15',
  destination: 'BOM',
  origin: 'DEL',
  tripType: 'one-way',
};

const offer: FlightOffer = {
  baggage: '15 kg check-in + 7 kg cabin',
  cabinClass: 'economy',
  currency: 'INR',
  fareFamily: 'Saver',
  id: 'offer-1',
  pricePerAdult: 5000,
  refundable: false,
  seatsRemaining: 3,
  segments: [
    {
      airlineCode: '6E',
      airlineName: 'IndiGo',
      arrivalAirport: 'BOM',
      arrivalAt: '2026-09-15T09:20:00+05:30',
      departureAirport: 'DEL',
      departureAt: '2026-09-15T07:10:00+05:30',
      durationMinutes: 130,
      flightNumber: '6E 201',
      leg: 'outbound',
      stops: 0,
    },
  ],
  supplier: 'Test adapter',
  totalPrice: 0,
};

test('flight criteria enforce airports, passenger bounds and travel dates', () => {
  assert.doesNotThrow(() => validateFlightSearchCriteria(criteria, { today: '2026-08-15' }));
  assert.throws(
    () => validateFlightSearchCriteria({ ...criteria, adults: 10 }, { today: '2026-08-15' }),
    /between 1 and 9/,
  );
  assert.throws(
    () => validateFlightSearchCriteria({ ...criteria, origin: 'Delhi' }, { today: '2026-08-15' }),
    /three-letter airport code/,
  );
  assert.throws(
    () => validateFlightSearchCriteria({ ...criteria, departureDate: '2026-08-14' }, { today: '2026-08-15' }),
    /cannot be in the past/,
  );
});

test('return searches require a return after departure', () => {
  assert.throws(
    () =>
      validateFlightSearchCriteria(
        { ...criteria, returnDate: '2026-09-15', tripType: 'return' },
        { today: '2026-08-15' },
      ),
    /later than departure/,
  );
});

test('supplier offers are normalized only when route, date, cabin and inventory match', () => {
  assert.equal(normalizeFlightOffer(offer, criteria)?.totalPrice, 10000);
  assert.equal(normalizeFlightOffer(offer, { ...criteria, departureDate: '2026-09-16' }), undefined);
  assert.equal(normalizeFlightOffer({ ...offer, seatsRemaining: 1 }, criteria), undefined);
  assert.equal(normalizeFlightOffer({ ...offer, currency: 'INR', pricePerAdult: -1 }, criteria), undefined);
});

test('supplier connections must form a continuous itinerary', () => {
  const disconnected: FlightOffer = {
    ...offer,
    segments: [
      offer.segments[0]!,
      {
        ...offer.segments[0]!,
        arrivalAirport: 'BLR',
        arrivalAt: '2026-09-15T13:00:00+05:30',
        departureAirport: 'HYD',
        departureAt: '2026-09-15T11:00:00+05:30',
      },
    ],
  };
  assert.equal(normalizeFlightOffer(disconnected, criteria), undefined);
});

test('return searches require complete outbound and return legs on the requested dates', () => {
  const returnOffer: FlightOffer = {
    ...offer,
    id: 'return-offer',
    segments: [
      offer.segments[0]!,
      {
        ...offer.segments[0]!,
        arrivalAirport: 'DEL',
        arrivalAt: '2026-09-18T12:00:00+05:30',
        departureAirport: 'BOM',
        departureAt: '2026-09-18T10:00:00+05:30',
        flightNumber: '6E 202',
        leg: 'return',
      },
    ],
  };
  const returnCriteria: FlightSearchCriteria = {
    ...criteria,
    returnDate: '2026-09-18',
    tripType: 'return',
  };
  assert.equal(normalizeFlightOffer(returnOffer, returnCriteria)?.totalPrice, 10000);
  assert.equal(normalizeFlightOffer(offer, returnCriteria), undefined);
  assert.equal(normalizeFlightOffer(returnOffer, criteria), undefined);
});
