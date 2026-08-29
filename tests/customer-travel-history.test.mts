import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  CUSTOMER_TRAVEL_HISTORY_ABSOLUTE_LIMIT,
  CUSTOMER_TRAVEL_HISTORY_DETAILS_LIMIT,
  CUSTOMER_TRAVEL_HISTORY_PAGE_SIZE,
  customerTravelHistoryDate,
  customerTravelHistoryDocument,
  customerTravelHistoryHotelReference,
  customerTravelHistoryMoney,
  customerTravelHistoryPage,
  customerTravelHistoryPagination,
  customerTravelHistoryStatus,
  customerTravelHistoryTransportDocument,
  customerTravelHistoryTransportReference,
} from '../services/customerTravelHistoryRules.ts';

test('directory controls and record windows are strictly bounded', () => {
  assert.equal(CUSTOMER_TRAVEL_HISTORY_PAGE_SIZE, 20);
  assert.equal(CUSTOMER_TRAVEL_HISTORY_ABSOLUTE_LIMIT, 500);
  assert.equal(customerTravelHistoryPage('2'), 2);
  assert.equal(customerTravelHistoryPage(['3', '999']), 3);
  assert.equal(customerTravelHistoryPage('0'), 1);
  assert.equal(customerTravelHistoryPage('1.5'), 1);
  assert.equal(customerTravelHistoryPage('9999999'), 1);
  assert.deepEqual(customerTravelHistoryPagination(999, 900), {
    page: 25,
    pages: 25,
    skip: 480,
  });
});

test('products, references, status, dates, and money fail closed', () => {
  assert.deepEqual(customerTravelHistoryTransportReference(' mf0123456789ab ', 'FLIGHT'), {
    bookingReference: 'MF0123456789AB',
    product: 'FLIGHT',
  });
  assert.equal(customerTravelHistoryTransportReference('MF0123456789AB', 'BUS'), null);
  assert.equal(customerTravelHistoryTransportReference('MT0123456789AB', 'HOTEL'), null);
  assert.equal(customerTravelHistoryHotelReference(' mta1b2c3d4e5f6 '), 'MTA1B2C3D4E5F6');
  assert.equal(customerTravelHistoryHotelReference('MTA1B2C3D4E5F6-extra'), null);
  assert.equal(customerTravelHistoryStatus('confirmed'), 'CONFIRMED');
  assert.equal(customerTravelHistoryStatus('unexpected-provider-state'), 'UNDER_REVIEW');
  assert.equal(customerTravelHistoryDate('2026-09-01'), '2026-09-01');
  assert.equal(customerTravelHistoryDate('2026-02-30'), null);
  assert.deepEqual(customerTravelHistoryMoney(12_500, 'INR'), {
    amount: 12_500,
    currency: 'INR',
  });
  assert.equal(customerTravelHistoryMoney(-1, 'INR'), null);
  assert.equal(customerTravelHistoryMoney(12_500, 'USD'), null);
});

test('stored transport document links are rebuilt from per-product allowlists', () => {
  const flight = customerTravelHistoryTransportDocument(
    'FLIGHT',
    'MF0123456789AB',
    JSON.stringify({
      bookingContact: { email: 'private@example.com' },
      documentQuery:
        'origin=DEL&destination=BOM&departureDate=2026-09-15&adults=1&cabinClass=economy&tripType=one-way&offerId=offer-1&providerRef=private&passenger=private',
      paymentReference: 'private-payment',
    }),
  );
  assert.ok(flight);
  assert.equal(flight.label, 'View itinerary');
  assert.match(flight.href, /^\/flights\/booking\/MF0123456789AB\/itinerary\?/);
  assert.doesNotMatch(flight.href, /providerRef|passenger|private@example|payment/i);
  const flightQuery = new URL(`https://example.test${flight.href}`).searchParams;
  assert.deepEqual([...flightQuery.keys()].sort(), [
    'adults',
    'cabinClass',
    'departureDate',
    'destination',
    'offerId',
    'origin',
    'tripType',
  ]);

  const bus = customerTravelHistoryTransportDocument(
    'BUS',
    'MB0123456789AB',
    JSON.stringify({
      documentQuery:
        'origin=Delhi&destination=Jaipur&travelDate=2026-09-20&passengers=2&seats=L1%2CL2&offerId=bus-1&contactPhone=private',
    }),
  );
  assert.ok(bus);
  assert.equal(bus.label, 'View ticket');
  assert.doesNotMatch(bus.href, /contactPhone|private/i);

  const car = customerTravelHistoryTransportDocument(
    'CAR',
    'MC0123456789AB',
    JSON.stringify({
      documentQuery:
        'pickupLocation=Delhi&dropoffLocation=Delhi&pickupDate=2026-10-10&pickupTime=10%3A00&dropoffDate=2026-10-13&dropoffTime=10%3A00&drivers=1&rentalMode=self-drive&offerId=car-1&driverLicense=private',
    }),
  );
  assert.ok(car);
  assert.equal(car.label, 'View voucher');
  assert.doesNotMatch(car.href, /driverLicense|private/i);
});

test('missing, ambiguous, malformed, or oversized document evidence exposes no link', () => {
  const valid =
    'origin=DEL&destination=BOM&departureDate=2026-09-15&adults=1&cabinClass=economy&tripType=one-way&offerId=offer-1';
  assert.equal(
    customerTravelHistoryTransportDocument(
      'FLIGHT',
      'MF0123456789AB',
      JSON.stringify({ documentQuery: `${valid}&offerId=offer-2` }),
    ),
    null,
  );
  assert.equal(
    customerTravelHistoryTransportDocument(
      'FLIGHT',
      'MF0123456789AB',
      JSON.stringify({ documentQuery: valid.replace('&offerId=offer-1', '') }),
    ),
    null,
  );
  assert.equal(
    customerTravelHistoryTransportDocument(
      'BUS',
      'MB0123456789AB',
      JSON.stringify({
        documentQuery:
          'origin=Delhi&destination=Jaipur&travelDate=2026-09-20&passengers=2&seats=L1&offerId=bus-1',
      }),
    ),
    null,
  );
  assert.equal(
    customerTravelHistoryTransportDocument(
      'FLIGHT',
      'MF0123456789AB',
      'x'.repeat(CUSTOMER_TRAVEL_HISTORY_DETAILS_LIMIT + 1),
    ),
    null,
  );
  assert.equal(customerTravelHistoryTransportDocument('FLIGHT', 'MF0123456789AB', '{broken'), null);
});

test('account quick-history actions consume the same bounded document projection', () => {
  assert.deepEqual(customerTravelHistoryDocument('HOTEL', 'MTA1B2C3D4E5F6', null), {
    href: '/manage-booking/MTA1B2C3D4E5F6/voucher',
    label: 'View voucher',
  });
  assert.equal(customerTravelHistoryDocument('HOTEL', '../private', null), null);
  assert.equal(
    customerTravelHistoryDocument(
      'FLIGHT',
      'MF0123456789AB',
      JSON.stringify({
        documentQuery:
          'origin=DEL&destination=BOM&departureDate=2026-09-15&adults=1&cabinClass=economy&tripType=one-way&offerId=offer-1&providerRef=private',
      }),
    )?.href.includes('providerRef'),
    false,
  );

  const accountPage = readFileSync('app/account/page.tsx', 'utf8');
  assert.match(accountPage, /customerTravelHistoryDocument\(/);
  assert.match(accountPage, /getCustomerTravelHistoryDashboardTransport\(/);
  assert.doesNotMatch(accountPage, /tripFilter|\{ userId: user\.id \}, \{ email: user\.email \}/);
  assert.doesNotMatch(accountPage, /getTripDocumentAction|JSON\.parse|details\.documentQuery/);
  assert.doesNotMatch(accountPage, /\$\{details\.documentQuery\}/);
  assert.match(accountPage, /AccountProfileForm/);
  assert.match(accountPage, /PrivacyRequestManager/);
  assert.match(accountPage, /SessionManager/);
  assert.match(accountPage, /href: '\/account\/notifications'/);
  assert.match(accountPage, /href: '\/account\/benefits'/);
  assert.match(accountPage, /benefits-readiness\s+records/);
});

test('account dashboard transport ownership permits email fallback only for unclaimed rows', () => {
  const service = readFileSync('services/customerTravelHistoryService.ts', 'utf8');
  const dashboardService = service.slice(
    service.indexOf('export async function getCustomerTravelHistoryDashboardTransport'),
    service.indexOf('export async function getCustomerTravelHistory(', 1),
  );

  assert.match(dashboardService, /trip\."userId" = \$\{userId\}/);
  assert.match(dashboardService, /trip\."userId" IS NULL/);
  assert.match(dashboardService, /LOWER\(TRIM\(trip\."email"\)\) = \$\{sessionEmail\}/);
  assert.doesNotMatch(dashboardService, /OR \(trip\."email" =/);
});

test('directory ownership, projections, and page remain privacy scoped and read-only', () => {
  const service = readFileSync('services/customerTravelHistoryService.ts', 'utf8');
  const rules = readFileSync('services/customerTravelHistoryRules.ts', 'utf8');
  const types = readFileSync('types/customerTravelHistory.ts', 'utf8');
  const page = readFileSync('app/account/trips/page.tsx', 'utf8');
  const loading = readFileSync('app/account/trips/loading.tsx', 'utf8');
  const error = readFileSync('app/account/trips/error.tsx', 'utf8');

  assert.match(service, /trip\."userId" = \$\{userId\}/);
  assert.match(service, /trip\."userId" IS NULL/);
  assert.match(service, /LOWER\(TRIM\(trip\."email"\)\) = \$\{sessionEmail\}/);
  assert.match(service, /LOWER\(TRIM\(guest\."email"\)\) = \$\{sessionEmail\}/);
  assert.match(service, /LIMIT \$\{CUSTOMER_TRAVEL_HISTORY_ABSOLUTE_LIMIT \+ 1\}/);
  assert.match(service, /productType" IN \('FLIGHT', 'BUS', 'CAR'\)/);
  assert.match(rules, /CUSTOMER_TRAVEL_HISTORY_DETAILS_LIMIT = 32_000/);
  assert.match(page, /View booking details/);
  assert.match(page, /Request servicing/);
  assert.match(loading, /aria-busy="true"/);
  assert.match(error, /reset: \(\) => void/);

  for (const prohibited of [
    'accessTokenHash',
    'detailsJson',
    'driver',
    'email',
    'passenger',
    'payment',
    'provider',
    'rawJson',
    'specialRequests',
  ]) {
    assert.doesNotMatch(types, new RegExp(prohibited, 'i'));
  }
  assert.doesNotMatch(
    page,
    /accessTokenHash|detailsJson|driver|passenger|providerRef|JSON\.parse|prisma|fetch\(|<form|dangerouslySetInnerHTML/i,
  );
  assert.doesNotMatch(service, /guest:\s*true|payment:\s*true|accessTokenHash:\s*true/);
});
