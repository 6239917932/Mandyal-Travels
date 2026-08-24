import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  CUSTOMER_TRANSPORT_DETAILS_LIMIT,
  customerTransportBookingStatus,
  customerTransportDate,
  customerTransportMoney,
  customerTransportText,
  normalizeCustomerTransportReference,
  readCustomerTransportFacts,
} from '../services/customerTransportTripDetailRules.ts';

test('transport references close product selection to the encoded prefix', () => {
  assert.deepEqual(normalizeCustomerTransportReference(' mf0123456789ab '), {
    confirmationCode: 'MF0123456789AB',
    product: 'FLIGHT',
  });
  assert.equal(normalizeCustomerTransportReference('MT0123456789AB'), undefined);
  assert.equal(normalizeCustomerTransportReference('MF-too-short'), undefined);
  assert.equal(customerTransportBookingStatus('confirmed'), 'CONFIRMED');
  assert.equal(customerTransportBookingStatus('unexpected'), 'UNDER_REVIEW');
});

test('transport details expose only product-specific bounded scalar facts', () => {
  const flight = readCustomerTransportFacts(
    'FLIGHT',
    JSON.stringify({
      airlineName: 'Mandyal Air',
      departureAirport: 'DEL',
      destinationAirport: 'SXR',
      documentQuery: 'offerId=private',
      flightNumber: 'MT 204',
      passengerDraft: { email: 'private@example.com' },
      paymentStatus: 'captured',
      providerRef: 'private-provider-reference',
    }),
  );
  assert.deepEqual(flight, [
    { label: 'Airline', value: 'Mandyal Air' },
    { label: 'Flight', value: 'MT 204' },
    { label: 'Departure airport', value: 'DEL' },
    { label: 'Arrival airport', value: 'SXR' },
  ]);

  const car = readCustomerTransportFacts(
    'CAR',
    JSON.stringify({
      pickupLocation: 'Delhi',
      providerName: 'Internal supplier',
      vehicleName: 'SUV',
    }),
  );
  assert.deepEqual(car, [
    { label: 'Vehicle', value: 'SUV' },
    { label: 'Pickup location', value: 'Delhi' },
  ]);
  assert.deepEqual(readCustomerTransportFacts('BUS', '{broken'), []);
  assert.deepEqual(
    readCustomerTransportFacts('BUS', 'x'.repeat(CUSTOMER_TRANSPORT_DETAILS_LIMIT + 1)),
    [],
  );
});

test('untrusted display values, dates, and money fail closed', () => {
  assert.equal(customerTransportText(` SUV\u0000 ${'x'.repeat(200)}`, 'fallback', 40).length, 40);
  assert.equal(customerTransportText('\u0000', 'fallback', 40), 'fallback');
  assert.equal(customerTransportDate('2026-09-01'), '2026-09-01');
  assert.equal(customerTransportDate('2026-02-30'), null);
  assert.equal(customerTransportMoney(12_500, 'INR')?.amount, 12_500);
  assert.equal(customerTransportMoney(-1, 'INR'), null);
  assert.equal(customerTransportMoney(12_500, 'USD'), null);
});

test('ownership and support history remain exact and absolutely bounded', () => {
  const service = readFileSync('services/customerTransportTripDetailService.ts', 'utf8');
  assert.match(service, /trip\."userId" = \$\{input\.userId\}/);
  assert.match(service, /trip\."userId" IS NULL/);
  assert.match(service, /LOWER\(TRIM\(trip\."email"\)\) = \$\{email\}/);
  assert.match(service, /trip\."productType" = \$\{reference\.product\}/);
  assert.match(service, /userId: input\.userId/);
  assert.match(service, /CUSTOMER_TRANSPORT_SUPPORT_LIMIT = 25/);
  assert.match(service, /take: CUSTOMER_TRANSPORT_SUPPORT_LIMIT \+ 1/);
  assert.match(service, /CUSTOMER_TRANSPORT_EVENT_LIMIT = 51/);
});

test('DTO and page exclude private data and expose no mutation authority', () => {
  const service = readFileSync('services/customerTransportTripDetailService.ts', 'utf8');
  const types = readFileSync('types/customerTransportTripDetail.ts', 'utf8');
  const page = readFileSync('app/account/trips/[confirmationCode]/page.tsx', 'utf8');
  const directory = readFileSync('app/account/trips/page.tsx', 'utf8');
  const loading = readFileSync('app/account/trips/[confirmationCode]/loading.tsx', 'utf8');
  const error = readFileSync('app/account/trips/[confirmationCode]/error.tsx', 'utf8');

  assert.match(page, /getCurrentUser\(\)/);
  assert.match(page, /Provider fulfilment/);
  assert.match(page, /Connection pending/);
  assert.match(page, /aria-label="Transport booking actions"/);
  assert.match(page, /cannot change or cancel travel/);
  assert.match(directory, /View booking details/);
  assert.match(loading, /aria-busy="true"/);
  assert.match(error, /retry: \(\) => void/);

  for (const source of [service, types, page]) {
    for (const prohibited of [
      'accessTokenHash',
      'providerRef',
      'offerId',
      'paymentStatus',
      'passengerDraft',
      'driver',
      'documentQuery',
      'payloadJson',
      'reconciliationNote',
      'Cashfree',
    ]) {
      assert.doesNotMatch(source, new RegExp(prohibited, 'i'));
    }
  }
  assert.doesNotMatch(types, /detailsJson/);
  assert.doesNotMatch(page, /detailsJson|JSON\.parse|fetch\(|<form|\/api\/v1\//);
});
