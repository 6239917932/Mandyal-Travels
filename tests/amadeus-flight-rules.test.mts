import assert from 'node:assert/strict';
import test from 'node:test';

import {
  amadeusApiOrigin,
  buildAmadeusFlightSearchUrl,
  mapAmadeusFlightOffers,
  readAmadeusFlightConfiguration,
} from '../lib/flight/amadeusRules.ts';
import type { FlightSearchCriteria } from '../types/flight.ts';

const criteria: FlightSearchCriteria = {
  adults: 2,
  cabinClass: 'economy',
  departureDate: '2026-09-15',
  destination: 'BOM',
  origin: 'DEL',
  tripType: 'one-way',
};

test('Amadeus configuration is explicit and rejects test inventory in production', () => {
  assert.equal(readAmadeusFlightConfiguration({}), undefined);
  assert.throws(
    () =>
      readAmadeusFlightConfiguration({
        AMADEUS_CLIENT_ID: 'valid-client',
        AMADEUS_CLIENT_SECRET: 'valid-secret',
        AMADEUS_ENVIRONMENT: 'test',
        AMADEUS_FLIGHT_ENABLED: 'true',
        NODE_ENV: 'production',
      }),
    /cannot be enabled in production/,
  );
  assert.deepEqual(
    readAmadeusFlightConfiguration({
      AMADEUS_CLIENT_ID: 'valid-client',
      AMADEUS_CLIENT_SECRET: 'valid-secret',
      AMADEUS_ENVIRONMENT: 'production',
      AMADEUS_FLIGHT_ENABLED: 'true',
      NODE_ENV: 'production',
    }),
    { clientId: 'valid-client', clientSecret: 'valid-secret', environment: 'production' },
  );
});

test('Amadeus search URL is fixed to normalized flight criteria', () => {
  const url = buildAmadeusFlightSearchUrl(amadeusApiOrigin('test'), criteria);
  assert.equal(url?.origin, 'https://test.api.amadeus.com');
  assert.equal(url?.pathname, '/v2/shopping/flight-offers');
  assert.equal(url?.searchParams.get('originLocationCode'), 'DEL');
  assert.equal(url?.searchParams.get('destinationLocationCode'), 'BOM');
  assert.equal(url?.searchParams.get('adults'), '2');
  assert.equal(url?.searchParams.get('travelClass'), 'ECONOMY');
  assert.equal(url?.searchParams.get('currencyCode'), 'INR');
  assert.equal(url?.searchParams.get('max'), '20');
  assert.equal(
    buildAmadeusFlightSearchUrl(amadeusApiOrigin('test'), {
      ...criteria,
      multiCitySegments: [
        { departureDate: '2026-09-15', destination: 'BOM', origin: 'DEL' },
        { departureDate: '2026-09-18', destination: 'BLR', origin: 'BOM' },
      ],
      tripType: 'multi-city',
    }),
    undefined,
  );
});

test('Amadeus offers are normalized without inventing refundability', () => {
  const offers = mapAmadeusFlightOffers(
    {
      data: [
        {
          id: '42',
          itineraries: [
            {
              segments: [
                {
                  arrival: { at: '2026-09-15T09:20:00+05:30', iataCode: 'BOM' },
                  carrierCode: 'AI',
                  departure: { at: '2026-09-15T07:10:00+05:30', iataCode: 'DEL' },
                  duration: 'PT2H10M',
                  number: '201',
                  numberOfStops: 0,
                },
              ],
            },
          ],
          numberOfBookableSeats: 4,
          price: { currency: 'INR', grandTotal: '12000.00' },
          travelerPricings: [
            {
              fareDetailsBySegment: [
                {
                  brandedFareLabel: 'Economy value',
                  cabin: 'ECONOMY',
                  includedCheckedBags: { weight: 15, weightUnit: 'KG' },
                },
              ],
            },
          ],
        },
      ],
      dictionaries: { carriers: { AI: 'Air India' } },
    },
    criteria,
    'test',
  );
  assert.equal(offers.length, 1);
  assert.equal(offers[0]?.supplier, 'Amadeus test inventory — not bookable');
  assert.equal(offers[0]?.pricePerAdult, 6000);
  assert.equal(offers[0]?.totalPrice, 12000);
  assert.equal(offers[0]?.refundable, false);
  assert.equal(offers[0]?.refundabilityStatus, 'requires-confirmation');
  assert.equal(offers[0]?.segments[0]?.durationMinutes, 130);
  assert.equal(offers[0]?.segments[0]?.airlineName, 'Air India');
  assert.equal(offers[0]?.baggage, '15 kg checked baggage included');
});

test('Amadeus mapper drops incomplete or non-INR offers', () => {
  assert.deepEqual(
    mapAmadeusFlightOffers(
      {
        data: [
          {
            id: '42',
            itineraries: [],
            numberOfBookableSeats: 4,
            price: { currency: 'USD', grandTotal: '120' },
          },
        ],
      },
      criteria,
      'production',
    ),
    [],
  );
});
