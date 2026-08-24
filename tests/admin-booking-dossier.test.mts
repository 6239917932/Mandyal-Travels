import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ADMIN_BOOKING_DOSSIER_ACTIVITY_LIMIT,
  adminBookingDossierLinks,
  isAdminBookingProduct,
  loadAdminBookingDossier,
  normalizeAdminBookingReference,
  readAdminTransportDetails,
} from '../services/adminBookingDossierService.ts';

test('booking references and products are closed before lookup', async () => {
  assert.equal(normalizeAdminBookingReference('  mfabc12345  '), 'MFABC12345');
  assert.equal(normalizeAdminBookingReference('../private'), null);
  assert.equal(normalizeAdminBookingReference('x'.repeat(41)), null);
  assert.equal(isAdminBookingProduct('HOTEL'), true);
  assert.equal(isAdminBookingProduct('FLIGHT'), true);
  assert.equal(isAdminBookingProduct('CRUISE'), false);
  assert.equal(await loadAdminBookingDossier('../private'), null);
  assert.equal(ADMIN_BOOKING_DOSSIER_ACTIVITY_LIMIT, 20);
});

test('transport details use product-specific scalar allowlists only', () => {
  const flight = readAdminTransportDetails(
    'FLIGHT',
    JSON.stringify({
      airlineName: 'Mandyal Air',
      departureAirport: 'DEL',
      departureDate: '2026-09-01',
      destinationAirport: 'SXR',
      documentQuery: 'hidden',
      flightNumber: 'MT 204',
      passengerDraft: { email: 'private@example.com' },
      providerRef: 'secret-provider-reference',
    }),
  );
  assert.deepEqual(flight, [
    { label: 'Airline', value: 'Mandyal Air' },
    { label: 'Flight', value: 'MT 204' },
    { label: 'Departure airport', value: 'DEL' },
    { label: 'Arrival airport', value: 'SXR' },
    { label: 'Departure date', value: '2026-09-01' },
  ]);

  const bus = readAdminTransportDetails(
    'BUS',
    JSON.stringify({ operatorName: 'Valley Bus', origin: 'Delhi', seats: '4A,4B' }),
  );
  assert.deepEqual(bus, [
    { label: 'Operator', value: 'Valley Bus' },
    { label: 'Origin', value: 'Delhi' },
    { label: 'Seats', value: '4A,4B' },
  ]);
  assert.deepEqual(readAdminTransportDetails('CRUISE', '{}'), []);
  assert.deepEqual(readAdminTransportDetails('CAR', '{broken'), []);
});

test('transport detail strings are normalized and bounded', () => {
  const details = readAdminTransportDetails(
    'CAR',
    JSON.stringify({ vehicleName: `  SUV\u0000 ${'x'.repeat(200)}  ` }),
  );
  assert.equal(details.length, 1);
  assert.equal(details[0]?.label, 'Vehicle');
  assert.equal(details[0]?.value.length, 160);
  assert.doesNotMatch(details[0]?.value ?? '', /\u0000/);
});

test('specialist links preserve reference and closed product context', () => {
  assert.deepEqual(
    adminBookingDossierLinks({
      confirmationCode: 'MT-ABC123',
      product: 'HOTEL',
      userId: null,
    }),
    {
      amendments: '/admin#hotel-amendments',
      customer: '/admin/users',
      directory: '/admin/bookings?q=MT-ABC123&product=HOTEL',
      documents: '/admin/documents?q=MT-ABC123&product=HOTEL',
      finance: '/admin/finance?q=MT-ABC123&refundStatus=ALL&window=ALL',
      support: '/admin/support?type=CUSTOMER&status=ALL&q=MT-ABC123',
    },
  );
  assert.equal(
    adminBookingDossierLinks({
      confirmationCode: 'MF12345678',
      product: 'FLIGHT',
      userId: 'user-1',
    }).finance,
    null,
  );
});

test('missing hotel customer identity links to the unfiltered customer directory', () => {
  const links = adminBookingDossierLinks({
    confirmationCode: 'MT-HOTEL-01',
    product: 'HOTEL',
    userId: null,
  });

  assert.equal(links.customer, '/admin/users');
});

test('admin dossier page is protected, read-only, bounded, and privacy safe', async () => {
  const [page, service, types, directory, error, loading] = await Promise.all([
    readFile(new URL('../app/admin/bookings/[confirmationCode]/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../services/adminBookingDossierService.ts', import.meta.url), 'utf8'),
    readFile(new URL('../types/adminBookingDossier.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/bookings/page.tsx', import.meta.url), 'utf8'),
    readFile(
      new URL('../app/admin/bookings/[confirmationCode]/error.tsx', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../app/admin/bookings/[confirmationCode]/loading.tsx', import.meta.url),
      'utf8',
    ),
  ]);

  assert.match(page, /getPlatformAdmin\(\)/);
  assert.match(page, /loadAdminBookingDossier\(confirmationCode\)/);
  assert.match(page, /if \(!dossier\) notFound\(\)/);
  assert.match(page, /Evidence, not authority/);
  assert.match(page, /dossier\.refunds\.total > dossier\.refunds\.items\.length/);
  assert.match(page, /dossier\.support\.total > dossier\.support\.items\.length/);
  assert.match(service, /take: ADMIN_BOOKING_DOSSIER_ACTIVITY_LIMIT/g);
  assert.doesNotMatch(service, /\/admin\/users\?q=/);
  assert.match(directory, /View dossier/g);
  assert.match(error, /retry: \(\) => void/);
  assert.match(loading, /aria-busy="true"/);

  for (const source of [page, service, types]) {
    for (const prohibited of [
      'accessTokenHash',
      'providerRef',
      'checkoutUrl',
      'reconciliationNote',
      'partnerNote',
      'reviewNote',
      'specialRequests',
      'payloadJson',
      'identityDocument',
      'Cashfree',
    ]) {
      assert.doesNotMatch(source, new RegExp(prohibited, 'i'));
    }
  }
  assert.doesNotMatch(page, /detailsJson|JSON\.parse|<form|fetch\(|\/api\/v1\//);
  assert.doesNotMatch(types, /detailsJson/);
});
